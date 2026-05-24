import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { getSessionUserApproved } from "@/lib/auth-server";
import { connectDB } from "@/lib/mongodb";
import { Notification } from "@/models";
import { jsonError, jsonOk } from "@/app/api/_utils";

type Params = { params: Promise<{ id: string }> };

/**
 * Mark a single notification as read. The caller must either own it
 * (`recipient_user_id`) or match the role/branch broadcast — same matching
 * rules as the list endpoint.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSessionUserApproved();
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return jsonError("Invalid notification id", 400);
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

  const res = await Notification.updateOne(
    { _id: id, $or: or },
    { $set: { read_at: new Date() } },
  );

  if (res.matchedCount === 0) {
    return jsonError("Not found", 404);
  }

  return jsonOk({ ok: true });
}
