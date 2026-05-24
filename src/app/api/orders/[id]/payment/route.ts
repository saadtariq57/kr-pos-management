import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { getSessionUserApproved } from "@/lib/auth-server";
import { canRecordOrderPayment } from "@/lib/rbac";
import { jsonError, jsonOk } from "@/app/api/_utils";
import { connectDB } from "@/lib/mongodb";
import { Order, Payment } from "@/models";

const METHODS = ["cash", "card", "online"] as const;

function isPaidStatus(s: string) {
  return s === "paid" || s === "completed";
}

type Params = { params: Promise<{ id: string }> };

/**
 * Record payment for an order (cashier / admin / manager).
 * Payment is only accepted after the order has been marked served.
 * Body: { payment_method: "cash" | "card" | "online", transaction_reference?: string }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSessionUserApproved();
  if (!session || !canRecordOrderPayment(session.role)) {
    return jsonError("Forbidden", 403);
  }

  const { id: orderId } = await params;
  if (!mongoose.isValidObjectId(orderId)) {
    return jsonError("Invalid order id", 400);
  }

  await connectDB();

  const order = await Order.findById(orderId).select("status").lean();
  if (!order) {
    return jsonError("Order not found", 404);
  }
  if (order.status !== "served") {
    return jsonError(
      "Payment can only be recorded after the order is marked served",
      400,
    );
  }

  const body = await req.json();
  const method = String(body?.payment_method ?? "").toLowerCase();
  if (!METHODS.includes(method as (typeof METHODS)[number])) {
    return jsonError("payment_method must be cash, card, or online", 400);
  }
  const transaction_reference = body?.transaction_reference
    ? String(body.transaction_reference).trim()
    : null;

  const existing = await Payment.findOne({ order_id: orderId });
  if (existing && isPaidStatus(existing.payment_status)) {
    return jsonOk({
      ok: true,
      alreadyPaid: true,
      payment: {
        _id: String(existing._id),
        payment_status: existing.payment_status,
        payment_method: existing.payment_method,
        paid_at: existing.paid_at,
        transaction_reference: existing.transaction_reference,
      },
    });
  }

  const now = new Date();
  if (existing) {
    existing.payment_method = method;
    existing.payment_status = "paid";
    existing.paid_at = now;
    if (transaction_reference) {
      existing.transaction_reference = transaction_reference;
    }
    await existing.save();
    const lean = await Payment.findById(existing._id).lean();
    return jsonOk({
      ok: true,
      payment: {
        _id: String(lean!._id),
        payment_status: lean!.payment_status,
        payment_method: lean!.payment_method,
        paid_at: lean!.paid_at,
        transaction_reference: lean!.transaction_reference,
      },
    });
  }

  const created = await Payment.create({
    order_id: new mongoose.Types.ObjectId(orderId),
    payment_method: method,
    payment_status: "paid",
    paid_at: now,
    transaction_reference,
  });
  return jsonOk({
    ok: true,
    payment: {
      _id: String(created._id),
      payment_status: created.payment_status,
      payment_method: created.payment_method,
      paid_at: created.paid_at,
      transaction_reference: created.transaction_reference,
    },
  });
}
