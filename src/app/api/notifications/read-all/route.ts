import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { getSessionUserApproved } from "@/lib/auth-server";
import { connectDB } from "@/lib/mongodb";
import { Notification } from "@/models";
import { jsonError, jsonOk } from "@/app/api/_utils";

/**
 * Mark every unread notification addressed to the caller as read in one shot.
 * Used by the bell's "Mark all read" action.
 */
export async function POST(_req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  await connectDB();
  const myId = new mongoose.Types.ObjectId(session.id);
  const branchId = session.branch?.id
    ? new mongoose.Types.ObjectId(session.branch.id)
    : null;

  const or: Record<string, unknown>[] = [{ recipient_user_id: myId }];
  if (branchId) {
    or.push({
      recipient_role: session.role.toLowerCase(),
      branch_id: branchId,
    });
  }

  const res = await Notification.updateMany(
    { $or: or, read_at: null },
    { $set: { read_at: new Date() } },
  );

  return jsonOk({ ok: true, updated: res.modifiedCount });
}
