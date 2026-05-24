import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { getSessionUserApproved } from "@/lib/auth-server";
import { connectDB } from "@/lib/mongodb";
import { Notification } from "@/models";
import { jsonError, jsonOk } from "@/app/api/_utils";

/**
 * List notifications addressed to the current user.
 *
 * Matches both addressing modes:
 *   - direct: `recipient_user_id = me.id`
 *   - role-based: `recipient_role = me.role` AND `branch_id = me.branch.id`
 *
 * Query params:
 *   - `unread=1` → only rows where `read_at` is null
 *   - `limit`    → default 20, max 100
 */
export async function GET(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  await connectDB();
  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "1";
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit") || "20") || 20),
  );

  const myId = new mongoose.Types.ObjectId(session.id);
  const branchId = session.branch?.id
    ? new mongoose.Types.ObjectId(session.branch.id)
    : null;

  const or: Record<string, unknown>[] = [{ recipient_user_id: myId }];
  // Role broadcasts only match the same branch. Admins (no branch) still get
  // their direct messages; we don't flood them with every branch's role-wide
  // alerts.
  if (branchId) {
    or.push({
      recipient_role: session.role.toLowerCase(),
      branch_id: branchId,
    });
  }

  const filter: Record<string, unknown> = { $or: or };
  if (unreadOnly) filter.read_at = null;

  const [items, unread_count] = await Promise.all([
    Notification.find(filter)
      .sort({ created_at: -1 })
      .limit(limit)
      .lean(),
    Notification.countDocuments({ $or: or, read_at: null }),
  ]);

  return jsonOk({
    items: items.map((n) => ({
      ...n,
      _id: String((n as { _id: unknown })._id),
      order_id: (n as { order_id?: unknown }).order_id
        ? String((n as { order_id: unknown }).order_id)
        : null,
    })),
    unread_count,
  });
}
