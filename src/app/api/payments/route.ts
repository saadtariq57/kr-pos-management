import { NextRequest } from "next/server";

import { getSessionUserApproved } from "@/lib/auth-server";
import { connectDB } from "@/lib/mongodb";
import { Customer, Order, Payment } from "@/models";
import { jsonError, jsonOk, parseListQuery } from "@/app/api/_utils";

export async function GET(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  await connectDB();
  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Payment.find().sort({ paid_at: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Payment.countDocuments(),
  ]);

  const orderIds = items
    .map((p) => (p as { order_id?: unknown }).order_id)
    .filter(Boolean);
  const orders =
    orderIds.length > 0
      ? await Order.find({ _id: { $in: orderIds } })
          .select(
            "order_number order_type table_number final_amount status customer_id created_at",
          )
          .lean()
      : [];
  const orderMap = new Map(
    orders.map((o) => [String((o as { _id: unknown })._id), o]),
  );

  const customerIds = orders
    .map((o) => (o as { customer_id?: unknown }).customer_id)
    .filter(Boolean);
  const customers =
    customerIds.length > 0
      ? await Customer.find({ _id: { $in: customerIds } })
          .select("name phone")
          .lean()
      : [];
  const customerMap = new Map(
    customers.map((c) => [String((c as { _id: unknown })._id), c]),
  );

  const itemsOut = items.map((p) => {
    const oid = String((p as { order_id?: unknown }).order_id ?? "");
    const order = orderMap.get(oid) as
      | {
          order_number?: number;
          order_type?: string;
          table_number?: number | null;
          final_amount?: number;
          status?: string;
          customer_id?: unknown;
          created_at?: Date;
        }
      | undefined;
    const customer = order?.customer_id
      ? (customerMap.get(String(order.customer_id)) as
          | { name?: string; phone?: string }
          | undefined)
      : null;
    return {
      ...p,
      _id: String((p as { _id: unknown })._id),
      order_id: oid,
      order: order
        ? {
            order_number: order.order_number ?? null,
            order_type: order.order_type ?? null,
            table_number: order.table_number ?? null,
            final_amount: order.final_amount ?? null,
            status: order.status ?? null,
            created_at: order.created_at ?? null,
          }
        : null,
      customer: customer
        ? { name: customer.name ?? null, phone: customer.phone ?? null }
        : null,
    };
  });

  return jsonOk({ items: itemsOut, page, limit, total });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  if (!body?.order_id || !body?.payment_method || !body?.payment_status) {
    return jsonError("order_id, payment_method and payment_status are required");
  }

  try {
    const payment = await Payment.create({
      order_id: body.order_id,
      payment_method: body.payment_method,
      payment_status: body.payment_status,
      transaction_reference: body.transaction_reference ?? null,
      paid_at: body.paid_at ?? new Date(),
    });
    return jsonOk({ ok: true, payment });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create payment";
    return jsonError(msg, 400);
  }
}

