import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { getSessionUserApproved } from "@/lib/auth-server";
import { isAdmin } from "@/lib/rbac";
import { notify, notifyMany } from "@/lib/notifications";
import { computeTaxAndFinal, resolveMenuOrderLines } from "@/lib/order-lines";
import { checkOrderTransition, isTerminalStatus } from "@/lib/order-status";
import { isValidPhone, PHONE_HINT } from "@/lib/validation";
import { jsonError, jsonOk } from "@/app/api/_utils";
import { connectDB } from "@/lib/mongodb";
import { Customer, MenuItem, Order, OrderItem, Payment, User } from "@/models";

const ORDER_TYPES = ["dine-in", "takeaway"] as const;

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSessionUserApproved();
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  await connectDB();
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return jsonError("Invalid order id", 400);
  }

  const order = await Order.findById(id).lean();
  if (!order) return jsonError("Order not found", 404);

  const items = await OrderItem.find({ order_id: id }).lean();
  const menuIds = items.map((i) => i.menu_item_id);
  const menus = await MenuItem.find({ _id: { $in: menuIds } })
    .select("item_name")
    .lean();
  const menuMap = new Map(
    menus.map((m) => [String((m as { _id: unknown })._id), m]),
  );

  const customer = (order as { customer_id?: unknown }).customer_id
    ? await Customer.findById((order as { customer_id: unknown }).customer_id)
        .select("name phone email")
        .lean()
    : null;

  const orderTyped = order as {
    staff_id?: unknown;
    waiter_id?: unknown;
    accepted_by_chef_id?: unknown;
  };
  const staffIds = [
    orderTyped.staff_id,
    orderTyped.waiter_id,
    orderTyped.accepted_by_chef_id,
  ].filter(Boolean) as unknown[];
  const staffRows =
    staffIds.length > 0
      ? await User.find({ _id: { $in: staffIds } })
          .select("name role")
          .lean()
      : [];
  const staffMap = new Map(
    staffRows.map((u) => [
      String((u as { _id: unknown })._id),
      u as { name: string; role: string },
    ]),
  );
  const cashier = orderTyped.staff_id
    ? staffMap.get(String(orderTyped.staff_id)) ?? null
    : null;
  const waiter = orderTyped.waiter_id
    ? staffMap.get(String(orderTyped.waiter_id)) ?? null
    : null;
  const chef = orderTyped.accepted_by_chef_id
    ? staffMap.get(String(orderTyped.accepted_by_chef_id)) ?? null
    : null;

  const itemsOut = items.map((i) => {
    const mid = String(i.menu_item_id);
    const menu = menuMap.get(mid) as { item_name?: string } | undefined;
    return {
      _id: String(i._id),
      menu_item_id: mid,
      item_name: menu?.item_name ?? "Item",
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.total_price,
    };
  });

  const paymentRows = await Payment.find({ order_id: id })
    .sort({ _id: -1 })
    .lean();
  const paidRow = paymentRows.find(
    (p) =>
      p.payment_status === "paid" || p.payment_status === "completed",
  );
  const paymentDoc = paidRow ?? paymentRows[0] ?? null;
  const paid = !!paidRow;
  const payment = paymentDoc
    ? {
        _id: String((paymentDoc as { _id: unknown })._id),
        payment_status: paymentDoc.payment_status,
        payment_method: paymentDoc.payment_method,
        paid_at: paymentDoc.paid_at,
        transaction_reference: paymentDoc.transaction_reference,
      }
    : null;

  return jsonOk({
    order: {
      ...order,
      _id: String((order as { _id: unknown })._id),
    },
    items: itemsOut,
    customer,
    payment,
    is_paid: !!paid,
    cashier,
    waiter,
    chef,
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSessionUserApproved();
  if (!session) {
    return jsonError("Unauthorized", 401);
  }
  if (!isAdmin(session.role)) {
    return jsonError("Only an admin can delete orders", 403);
  }

  await connectDB();
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return jsonError("Invalid order id", 400);
  }

  try {
    await Promise.all([
      OrderItem.deleteMany({ order_id: id }),
      Payment.deleteMany({ order_id: id }),
    ]);
    await Order.findByIdAndDelete(id);
    return jsonOk({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete order";
    return jsonError(msg, 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSessionUserApproved();
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  await connectDB();
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return jsonError("Invalid order id", 400);
  }

  const existing = await Order.findById(id);
  if (!existing) return jsonError("Order not found", 404);

  const body = await req.json();
  const update: Record<string, unknown> = {};

  // Status transitions go through the state machine. Side effects (claiming
  // a ticket, timestamps, notifications) are scheduled here and fired after
  // the save so a failed Mongo write doesn't leak a phantom notification.
  type Side = {
    notify?: Parameters<typeof notify>[0];
    notifyMany?: Parameters<typeof notifyMany>[0];
  };
  const sideEffects: Side[] = [];

  if (body?.status != null && body.status !== existing.status) {
    const transition = checkOrderTransition({
      from: existing.status,
      to: String(body.status),
      actor: { id: session.id, role: session.role },
      currentAcceptedBy: existing.accepted_by_chef_id
        ? String(existing.accepted_by_chef_id)
        : null,
    });
    if (!transition.ok) {
      return jsonError(transition.error, transition.status);
    }

    if (body.status === "completed") {
      const paidRow = await Payment.findOne({
        order_id: id,
        payment_status: { $in: ["paid", "completed"] },
      }).lean();
      if (!paidRow) {
        return jsonError(
          "Record payment before completing the order",
          400,
        );
      }
    }

    update.status = body.status;
    const branchId = existing.branch_id ?? null;
    const orderNumber = existing.order_number;
    const cashierId = existing.staff_id ? String(existing.staff_id) : null;
    const waiterId = existing.waiter_id ? String(existing.waiter_id) : null;

    if (body.status === "preparing") {
      // First chef to PATCH wins the claim. We don't actually enforce
      // uniqueness at the DB level — concurrent accepts simply overwrite,
      // and the kitchen UI hides the button once `accepted_by_chef_id`
      // is non-null so the race window is tiny.
      update.accepted_by_chef_id = new mongoose.Types.ObjectId(session.id);
      update.accepted_at = new Date();

      const recipients: Parameters<typeof notifyMany>[0] = [];
      if (cashierId) {
        recipients.push({
          type: "order.accepted",
          title: `Order #${orderNumber} accepted`,
          body: `Chef ${session.name} is preparing it.`,
          order_id: id,
          branch_id: branchId,
          recipient_user_id: cashierId,
        });
      }
      if (waiterId) {
        recipients.push({
          type: "order.accepted",
          title: `Order #${orderNumber} accepted`,
          body: `Chef ${session.name} is preparing it.`,
          order_id: id,
          branch_id: branchId,
          recipient_user_id: waiterId,
        });
      }
      if (recipients.length) sideEffects.push({ notifyMany: recipients });
    }

    if (body.status === "ready") {
      const recipients: Parameters<typeof notifyMany>[0] = [];
      if (cashierId) {
        recipients.push({
          type: "order.ready",
          title: `Order #${orderNumber} is ready`,
          body: "Pick up from the pass.",
          order_id: id,
          branch_id: branchId,
          recipient_user_id: cashierId,
        });
      }
      if (waiterId) {
        recipients.push({
          type: "order.ready",
          title: `Order #${orderNumber} is ready`,
          body: "Pick up from the pass.",
          order_id: id,
          branch_id: branchId,
          recipient_user_id: waiterId,
        });
      }
      if (recipients.length) sideEffects.push({ notifyMany: recipients });
    }

    if (body.status === "served") {
      if (waiterId) {
        sideEffects.push({
          notify: {
            type: "order.served",
            title: `Order #${orderNumber} served`,
            body: "Delivered to the customer.",
            order_id: id,
            branch_id: branchId,
            recipient_user_id: waiterId,
          },
        });
      }
    }

    if (body.status === "completed") {
      update.completed_at = new Date();
      const recipients: Parameters<typeof notifyMany>[0] = [];
      if (cashierId) {
        recipients.push({
          type: "order.completed",
          title: `Order #${orderNumber} closed`,
          body: "Ticket completed.",
          order_id: id,
          branch_id: branchId,
          recipient_user_id: cashierId,
        });
      }
      if (waiterId) {
        recipients.push({
          type: "order.completed",
          title: `Order #${orderNumber} closed`,
          body: "Ticket completed.",
          order_id: id,
          branch_id: branchId,
          recipient_user_id: waiterId,
        });
      }
      if (recipients.length) sideEffects.push({ notifyMany: recipients });
    }

    if (body.status === "cancelled") {
      const recipients: Parameters<typeof notifyMany>[0] = [];
      // Notify the kitchen so any chef who claimed it stops preparing.
      recipients.push({
        type: "order.cancelled",
        title: `Order #${orderNumber} cancelled`,
        body: "Stop preparing.",
        order_id: id,
        branch_id: branchId,
        recipient_role: "chef",
      });
      if (waiterId) {
        recipients.push({
          type: "order.cancelled",
          title: `Order #${orderNumber} cancelled`,
          order_id: id,
          branch_id: branchId,
          recipient_user_id: waiterId,
        });
      }
      sideEffects.push({ notifyMany: recipients });
    }
  }
  if (body?.table_number !== undefined) update.table_number = body.table_number;
  if (body?.order_type != null) {
    const ot = String(body.order_type);
    if (!ORDER_TYPES.includes(ot as (typeof ORDER_TYPES)[number])) {
      return jsonError("order_type must be dine-in or takeaway");
    }
    update.order_type = ot;
  }

  const replaceItems = Array.isArray(body?.items);
  if (replaceItems) {
    if (isTerminalStatus(existing.status)) {
      return jsonError(
        "Cannot change line items on a completed or cancelled order",
        400,
      );
    }

    const resolved = await resolveMenuOrderLines(body.items);
    if (!resolved.ok) {
      return jsonError(resolved.error);
    }

    const discount_amount =
      body.discount_amount != null
        ? Math.max(0, Number(body.discount_amount) || 0)
        : existing.discount_amount;
    const tax_rate = Math.min(
      1,
      Math.max(0, Number(body?.tax_rate ?? 0) || 0),
    );

    const { subtotal_amount } = resolved;
    const { tax_amount, final_amount } = computeTaxAndFinal(
      subtotal_amount,
      discount_amount,
      tax_rate,
    );

    await OrderItem.deleteMany({ order_id: id });
    await OrderItem.insertMany(
      resolved.lines.map((l) => ({
        order_id: existing._id,
        menu_item_id: l.menu_item_id,
        quantity: l.quantity,
        unit_price: l.unit_price,
        total_price: l.total_price,
      })),
    );

    update.subtotal_amount = subtotal_amount;
    update.tax_amount = tax_amount;
    update.discount_amount = discount_amount;
    update.final_amount = final_amount;
  } else {
    if (body?.discount_amount != null || body?.tax_rate != null) {
      if (isTerminalStatus(existing.status)) {
        return jsonError(
          "Cannot change totals on a completed or cancelled order",
          400,
        );
      }

      const itemsRows = await OrderItem.find({ order_id: id }).lean();
      const subtotal_amount = Math.round(
        itemsRows.reduce((s, r) => s + r.total_price, 0) * 100,
      ) / 100;
      const discount_amount =
        body.discount_amount != null
          ? Math.max(0, Number(body.discount_amount) || 0)
          : existing.discount_amount;
      const tax_rate =
        body.tax_rate != null
          ? Math.min(1, Math.max(0, Number(body.tax_rate) || 0))
          : (() => {
              const base = Math.max(
                0,
                existing.subtotal_amount - existing.discount_amount,
              );
              if (base <= 0) return 0;
              return Math.min(
                1,
                existing.tax_amount > 0 ? existing.tax_amount / base : 0,
              );
            })();

      const { tax_amount, final_amount } = computeTaxAndFinal(
        subtotal_amount,
        discount_amount,
        tax_rate,
      );
      update.subtotal_amount = subtotal_amount;
      update.tax_amount = tax_amount;
      update.discount_amount = discount_amount;
      update.final_amount = final_amount;
    }
  }

  let customerUpdated = false;
  if (
    body?.customer_name != null ||
    body?.customer_phone != null ||
    body?.customer_email !== undefined
  ) {
    const cid = existing.customer_id;
    if (cid) {
      const cset: Record<string, unknown> = {};
      if (body.customer_name != null) {
        cset.name = String(body.customer_name).trim();
      }
      if (body.customer_phone != null) {
        const phone = String(body.customer_phone).trim();
        if (!isValidPhone(phone)) {
          return jsonError(PHONE_HINT, 400);
        }
        cset.phone = phone;
      }
      if (body.customer_email !== undefined) {
        cset.email = body.customer_email
          ? String(body.customer_email).trim()
          : null;
      }
      if (Object.keys(cset).length > 0) {
        await Customer.updateOne({ _id: cid }, { $set: cset });
        customerUpdated = true;
      }
    }
  }

  if (Object.keys(update).length === 0 && !customerUpdated) {
    return jsonError("No updatable fields provided", 400);
  }

  const order =
    Object.keys(update).length > 0
      ? await Order.findByIdAndUpdate(id, update, { new: true }).lean()
      : await Order.findById(id).lean();
  if (!order) return jsonError("Order not found", 404);

  for (const se of sideEffects) {
    if (se.notify) void notify(se.notify);
    if (se.notifyMany) void notifyMany(se.notifyMany);
  }

  return jsonOk({ ok: true, order });
}
