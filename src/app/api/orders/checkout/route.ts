import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { getSessionUserApproved } from "@/lib/auth-server";
import { notify } from "@/lib/notifications";
import { computeTaxAndFinal, resolveMenuOrderLines } from "@/lib/order-lines";
import { canPlaceOrders } from "@/lib/rbac";
import { connectDB } from "@/lib/mongodb";
import { Customer, Order, OrderItem, User } from "@/models";
import { isValidPhone, PHONE_HINT } from "@/lib/validation";
import { jsonError, jsonOk } from "@/app/api/_utils";

const ORDER_TYPES = ["dine-in", "takeaway"] as const;

/**
 * Cashier/admin checkout: creates customer if needed, validates prices from DB, creates order + items.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session || !canPlaceOrders(session.role)) {
    return jsonError("Only cashiers can place orders", 403);
  }

  await connectDB();
  const body = await req.json();

  const customer_name = String(body?.customer_name ?? "").trim();
  const customer_phone = String(body?.customer_phone ?? "").trim();
  const order_type = body?.order_type as string;
  const table_number =
    body?.table_number != null && body.table_number !== ""
      ? Number(body.table_number)
      : null;

  const discount_amount = Math.max(0, Number(body?.discount_amount ?? 0) || 0);
  const tax_rate = Math.min(1, Math.max(0, Number(body?.tax_rate ?? 0) || 0));

  const rawItems = Array.isArray(body?.items) ? body.items : [];
  const waiter_id_raw = body?.waiter_id ? String(body.waiter_id) : null;

  if (!customer_name || !customer_phone) {
    return jsonError("customer_name and customer_phone are required");
  }

  if (!isValidPhone(customer_phone)) {
    return jsonError(PHONE_HINT);
  }

  if (!ORDER_TYPES.includes(order_type as (typeof ORDER_TYPES)[number])) {
    return jsonError("order_type must be dine-in or takeaway");
  }

  // Waiter attribution is required so the kitchen + pass know who brought the
  // order in and who to hand the food back to. Admins are exempt because they
  // may create test orders without a floor waiter.
  if (!waiter_id_raw && session.role.toLowerCase() !== "admin") {
    return jsonError("waiter_id is required", 400);
  }

  let waiter_id: mongoose.Types.ObjectId | null = null;
  if (waiter_id_raw) {
    if (!mongoose.isValidObjectId(waiter_id_raw)) {
      return jsonError("waiter_id is not a valid id", 400);
    }
    const waiter = await User.findById(waiter_id_raw)
      .select("role is_active branch_id")
      .lean<{
        role: string;
        is_active?: boolean;
        branch_id?: unknown;
      } | null>();
    if (!waiter || waiter.is_active === false) {
      return jsonError("Selected waiter is not available", 400);
    }
    if (String(waiter.role).toLowerCase() !== "waiter") {
      return jsonError("Selected user is not a waiter", 400);
    }
    waiter_id = new mongoose.Types.ObjectId(waiter_id_raw);
  }

  // Branch context — pulled from the cashier's session so notifications and
  // kitchen scoping work without an extra round trip. Admins may have no
  // branch, in which case the ticket is global.
  const branch_id = session.branch?.id
    ? new mongoose.Types.ObjectId(session.branch.id)
    : null;

  const resolved = await resolveMenuOrderLines(rawItems);
  if (!resolved.ok) {
    return jsonError(resolved.error);
  }

  const { lines: resolvedLines, subtotal_amount } = resolved;
  const { tax_amount, final_amount } = computeTaxAndFinal(
    subtotal_amount,
    discount_amount,
    tax_rate,
  );

  let customer = await Customer.findOne({ phone: customer_phone }).lean();
  if (!customer) {
    const created = await Customer.create({
      name: customer_name,
      phone: customer_phone,
      email: null,
    });
    customer = created.toObject();
  } else {
    await Customer.updateOne(
      { _id: (customer as { _id: unknown })._id },
      { $set: { name: customer_name } },
    );
  }

  const last = await Order.findOne()
    .sort({ order_number: -1 })
    .select("order_number")
    .lean();
  const order_number =
    ((last as { order_number?: number } | null)?.order_number ?? 0) + 1;

  const staff_id = new mongoose.Types.ObjectId(session.id);

  const order = await Order.create({
    order_number,
    customer_id: (customer as { _id: mongoose.Types.ObjectId })._id,
    staff_id,
    waiter_id,
    branch_id,
    order_type,
    table_number,
    subtotal_amount,
    tax_amount,
    discount_amount,
    final_amount,
    status: "pending",
  });

  await OrderItem.insertMany(
    resolvedLines.map((l) => ({
      order_id: order._id,
      menu_item_id: l.menu_item_id,
      quantity: l.quantity,
      unit_price: l.unit_price,
      total_price: l.total_price,
    })),
  );

  // Broadcast to every chef in the branch — first one to hit "Accept" claims
  // the ticket. We don't await the result because notifications are best
  // effort and shouldn't block the checkout response.
  void notify({
    type: "order.created",
    title: `New order #${order_number}`,
    body: `${order_type}${table_number ? ` · Table ${table_number}` : ""} · ${resolvedLines.length} item${resolvedLines.length === 1 ? "" : "s"}`,
    order_id: order._id,
    branch_id,
    recipient_role: "chef",
    payload: { order_number, order_type, table_number },
  });

  // Lookup the waiter name so the bill PDF can show it without a follow-up
  // round trip. Cashier name comes straight from the session.
  let waiter_name: string | null = null;
  if (waiter_id) {
    const w = await User.findById(waiter_id).select("name").lean<{ name: string } | null>();
    waiter_name = w?.name ?? null;
  }

  return jsonOk({
    ok: true,
    bill: {
      order_number,
      currency: "PKR",
      subtotal_amount,
      tax_amount,
      discount_amount,
      final_amount,
      customer: { name: customer_name, phone: customer_phone },
      items: resolvedLines.map((l) => ({
        item_name: l.item_name,
        quantity: l.quantity,
        unit_price: l.unit_price,
        total_price: l.total_price,
      })),
      order_type,
      table_number,
      created_at: order.created_at,
      cashier_name: session.name,
      waiter_name,
      branch: session.branch
        ? { name: session.branch.name, city: session.branch.city }
        : null,
      payment: null,
    },
    order_id: String(order._id),
  });
}
