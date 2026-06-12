import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { getSessionUserApproved } from "@/lib/auth-server";
import { canRecordOrderPayment } from "@/lib/rbac";
import { jsonError, jsonOk } from "@/app/api/_utils";
import { connectDB } from "@/lib/mongodb";
import { Order, Payment } from "@/models";
import {
  getStripe,
  getStripeCurrency,
  isStripeConfigured,
  toStripeAmount,
} from "@/lib/stripe";

type Params = { params: Promise<{ id: string }> };

function isPaidStatus(s: string) {
  return s === "paid" || s === "completed";
}

/**
 * Create a Stripe PaymentIntent for an order's card payment and return its
 * client secret. The client mounts Stripe's Payment Element with this secret
 * and confirms the payment in-browser; once it succeeds, the existing
 * `/payment` endpoint records it with the PaymentIntent id as the reference.
 *
 * Guards mirror the payment endpoint: only cashier/manager/admin may charge,
 * and only after the order is served & still unpaid.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSessionUserApproved();
  if (!session || !canRecordOrderPayment(session.role)) {
    return jsonError("Forbidden", 403);
  }

  if (!isStripeConfigured()) {
    return jsonError(
      "Stripe is not configured. Add your test keys to .env to accept card payments.",
      503,
    );
  }

  const { id: orderId } = await params;
  if (!mongoose.isValidObjectId(orderId)) {
    return jsonError("Invalid order id", 400);
  }

  await connectDB();

  const order = await Order.findById(orderId)
    .select("status final_amount order_number")
    .lean<{
      status: string;
      final_amount: number;
      order_number: number;
    } | null>();
  if (!order) {
    return jsonError("Order not found", 404);
  }
  if (order.status !== "served") {
    return jsonError(
      "Payment can only be collected after the order is marked served",
      400,
    );
  }

  const existing = await Payment.findOne({ order_id: orderId })
    .select("payment_status")
    .lean<{ payment_status: string } | null>();
  if (existing && isPaidStatus(existing.payment_status)) {
    return jsonError("This order has already been paid", 400);
  }

  const amount = Number(order.final_amount) || 0;
  if (amount <= 0) {
    return jsonError("Order total must be greater than zero", 400);
  }

  const currency = getStripeCurrency();
  const stripe = getStripe();

  try {
    const intent = await stripe.paymentIntents.create({
      amount: toStripeAmount(amount, currency),
      currency,
      // Card-only for the POS terminal flow; no redirect-based methods.
      payment_method_types: ["card"],
      description: `KR Restaurant — Order #${order.order_number}`,
      metadata: {
        order_id: orderId,
        order_number: String(order.order_number),
        staff_id: session.id,
      },
    });

    return jsonOk({
      ok: true,
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
      amount,
      currency,
    });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Failed to start the card payment";
    return jsonError(msg, 502);
  }
}
