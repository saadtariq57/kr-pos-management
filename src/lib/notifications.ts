import mongoose from "mongoose";

import { Notification } from "@/models";

/**
 * Notification helpers for the in-app polling bus.
 *
 * Every status hop in the order lifecycle pushes a row here. The notification
 * bell on the topbar polls `/api/notifications?unread=1` every few seconds and
 * surfaces unread rows as a badge + toast. There are no websockets — polling
 * is plenty for a restaurant workflow and avoids extra infra on Vercel.
 *
 * Two addressing modes:
 *   - `recipient_user_id` targets one specific user (e.g. cashier who owns
 *     the ticket gets pinged when their order is ready).
 *   - `recipient_role` + `branch_id` broadcasts to every user with that role
 *     inside that branch (e.g. every chef in branch X sees a new ticket).
 */
export type NotifyType =
  | "order.created"
  | "order.accepted"
  | "order.ready"
  | "order.served"
  | "order.completed"
  | "order.cancelled";

type NotifyInput = {
  type: NotifyType;
  title: string;
  body?: string;
  order_id?: string | mongoose.Types.ObjectId | null;
  branch_id?: string | mongoose.Types.ObjectId | null;
  recipient_role?: string | null;
  recipient_user_id?: string | mongoose.Types.ObjectId | null;
  payload?: Record<string, unknown>;
};

function toObjectIdOrNull(
  v: string | mongoose.Types.ObjectId | null | undefined,
): mongoose.Types.ObjectId | null {
  if (!v) return null;
  if (v instanceof mongoose.Types.ObjectId) return v;
  if (typeof v === "string" && mongoose.isValidObjectId(v)) {
    return new mongoose.Types.ObjectId(v);
  }
  return null;
}

/**
 * Insert one notification row. Failures are swallowed and logged because
 * notifications are best-effort — a failed insert should never block the
 * status transition that triggered it.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await Notification.create({
      type: input.type,
      title: input.title,
      body: input.body ?? "",
      order_id: toObjectIdOrNull(input.order_id ?? null),
      branch_id: toObjectIdOrNull(input.branch_id ?? null),
      recipient_role: input.recipient_role ?? null,
      recipient_user_id: toObjectIdOrNull(input.recipient_user_id ?? null),
      payload: input.payload ?? {},
    });
  } catch (e) {
    console.warn("[notify] failed", e);
  }
}

/**
 * Push the same payload to several recipients in one go (e.g. notify the
 * cashier AND waiter when an order goes ready).
 */
export async function notifyMany(inputs: NotifyInput[]): Promise<void> {
  if (!inputs.length) return;
  try {
    await Notification.insertMany(
      inputs.map((i) => ({
        type: i.type,
        title: i.title,
        body: i.body ?? "",
        order_id: toObjectIdOrNull(i.order_id ?? null),
        branch_id: toObjectIdOrNull(i.branch_id ?? null),
        recipient_role: i.recipient_role ?? null,
        recipient_user_id: toObjectIdOrNull(i.recipient_user_id ?? null),
        payload: i.payload ?? {},
      })),
      { ordered: false },
    );
  } catch (e) {
    console.warn("[notifyMany] failed", e);
  }
}
