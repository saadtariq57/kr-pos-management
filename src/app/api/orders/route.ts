import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { getSessionUserApproved } from "@/lib/auth-server";
import { notify } from "@/lib/notifications";
import { canPlaceOrders } from "@/lib/rbac";
import { connectDB } from "@/lib/mongodb";
import { MenuItem, Order, OrderItem, Payment, User } from "@/models";
import { jsonError, jsonOk, parseListQuery } from "@/app/api/_utils";

export async function GET(req: NextRequest) {
  const authUser = await getSessionUserApproved();
  if (!authUser) {
    return jsonError("Unauthorized", 401);
  }

  await connectDB();
  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status");

  const filter: Record<string, unknown> = {};
  if (status) {
    filter.status = status;
  }

  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  const orderIds = items.map((o) => (o as { _id: unknown })._id);
  const paidRows =
    orderIds.length > 0
      ? await Payment.find({
          order_id: { $in: orderIds },
          payment_status: { $in: ["paid", "completed"] },
        })
          .select("order_id")
          .lean()
      : [];
  const paidSet = new Set(
    paidRows.map((p) => String((p as { order_id: unknown }).order_id)),
  );

  // Resolve all staff/waiter/chef names in one query so the list renders the
  // who-did-what columns without N+1 lookups.
  const userIds = new Set<string>();
  for (const o of items) {
    const r = o as {
      staff_id?: unknown;
      waiter_id?: unknown;
      accepted_by_chef_id?: unknown;
    };
    if (r.staff_id) userIds.add(String(r.staff_id));
    if (r.waiter_id) userIds.add(String(r.waiter_id));
    if (r.accepted_by_chef_id) userIds.add(String(r.accepted_by_chef_id));
  }
  const userRows =
    userIds.size > 0
      ? await User.find({ _id: { $in: Array.from(userIds) } })
          .select("name role")
          .lean()
      : [];
  const userMap = new Map(
    userRows.map((u) => [
      String((u as { _id: unknown })._id),
      (u as { name: string; role: string }) ?? null,
    ]),
  );

  // Load line items + menu names for every order in the page so the kitchen
  // display and the orders list can show what's on the ticket without a
  // per-order round trip.
  const lineRows =
    orderIds.length > 0
      ? await OrderItem.find({ order_id: { $in: orderIds } })
          .select("order_id menu_item_id quantity")
          .lean()
      : [];
  const menuItemIds = Array.from(
    new Set(
      lineRows.map((r) => String((r as { menu_item_id: unknown }).menu_item_id)),
    ),
  );
  const menuRows =
    menuItemIds.length > 0
      ? await MenuItem.find({ _id: { $in: menuItemIds } })
          .select("item_name")
          .lean()
      : [];
  const menuMap = new Map(
    menuRows.map((m) => [
      String((m as { _id: unknown })._id),
      (m as { item_name: string }).item_name,
    ]),
  );
  const linesByOrder = new Map<string, { item_name: string; quantity: number }[]>();
  for (const row of lineRows) {
    const oid = String((row as { order_id: unknown }).order_id);
    const mid = String((row as { menu_item_id: unknown }).menu_item_id);
    const arr = linesByOrder.get(oid) ?? [];
    arr.push({
      item_name: menuMap.get(mid) ?? "Item",
      quantity: (row as { quantity: number }).quantity,
    });
    linesByOrder.set(oid, arr);
  }

  const itemsOut = items.map((o) => {
    const oid = String((o as { _id: unknown })._id);
    const row = o as {
      staff_id?: unknown;
      waiter_id?: unknown;
      accepted_by_chef_id?: unknown;
    };
    const cashier = row.staff_id ? userMap.get(String(row.staff_id)) : null;
    const waiter = row.waiter_id ? userMap.get(String(row.waiter_id)) : null;
    const chef = row.accepted_by_chef_id
      ? userMap.get(String(row.accepted_by_chef_id))
      : null;
    return {
      ...o,
      _id: oid,
      is_paid: paidSet.has(oid),
      cashier_name: cashier?.name ?? null,
      waiter_name: waiter?.name ?? null,
      chef_name: chef?.name ?? null,
      items: linesByOrder.get(oid) ?? [],
    };
  });

  return jsonOk({ items: itemsOut, page, limit, total });
}

/**
 * Create an order with items.
 *
 * Expected body:
 * {
 *   order_number,
 *   customer_id?,
 *   staff_id?,
 *   order_type,
 *   table_number?,
 *   subtotal_amount,
 *   tax_amount,
 *   discount_amount,
 *   final_amount,
 *   status,
 *   items: [{ menu_item_id, quantity, unit_price, total_price }]
 * }
 */
export async function POST(req: NextRequest) {
  const authUser = await getSessionUserApproved();
  if (!authUser || !canPlaceOrders(authUser.role)) {
    return jsonError("Only cashiers can create orders", 403);
  }

  await connectDB();
  const body = await req.json();

  if (
    !body?.order_number ||
    !body?.order_type ||
    body.subtotal_amount == null ||
    body.tax_amount == null ||
    body.discount_amount == null ||
    body.final_amount == null ||
    !body?.status
  ) {
    return jsonError(
      "order_number, order_type, subtotal_amount, tax_amount, discount_amount, final_amount and status are required",
    );
  }

  const items = Array.isArray(body.items) ? body.items : [];

  const dbSession = await (await import("mongoose")).default.startSession();
  dbSession.startTransaction();

  try {
    const branchId = body.branch_id
      ? new mongoose.Types.ObjectId(String(body.branch_id))
      : authUser.branch?.id
        ? new mongoose.Types.ObjectId(authUser.branch.id)
        : null;
    const waiterId = body.waiter_id
      ? new mongoose.Types.ObjectId(String(body.waiter_id))
      : null;

    const order = await Order.create(
      [
        {
          order_number: body.order_number,
          customer_id: body.customer_id ?? null,
          staff_id: body.staff_id ?? null,
          waiter_id: waiterId,
          branch_id: branchId,
          order_type: body.order_type,
          table_number: body.table_number ?? null,
          subtotal_amount: body.subtotal_amount,
          tax_amount: body.tax_amount,
          discount_amount: body.discount_amount,
          final_amount: body.final_amount,
          status: body.status,
        },
      ],
      { session: dbSession },
    );

    const createdOrder = order[0];

    if (items.length > 0) {
      await OrderItem.insertMany(
        items.map((i: any) => ({
          order_id: createdOrder._id,
          menu_item_id: i.menu_item_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: i.total_price,
        })),
        { session: dbSession },
      );
    }

    await dbSession.commitTransaction();
    dbSession.endSession();

    if (createdOrder.status === "pending") {
      void notify({
        type: "order.created",
        title: `New order #${createdOrder.order_number}`,
        body: `${createdOrder.order_type}${
          createdOrder.table_number ? ` · Table ${createdOrder.table_number}` : ""
        }`,
        order_id: createdOrder._id,
        branch_id: branchId,
        recipient_role: "chef",
      });
    }

    return jsonOk({ ok: true, order: createdOrder });
  } catch (e) {
    await dbSession.abortTransaction();
    dbSession.endSession();
    const msg = e instanceof Error ? e.message : "Failed to create order";
    return jsonError(msg, 400);
  }
}

