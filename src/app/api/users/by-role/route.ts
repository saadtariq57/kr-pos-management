import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { getSessionUserApproved } from "@/lib/auth-server";
import { isAdmin } from "@/lib/rbac";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models";
import { jsonError, jsonOk } from "@/app/api/_utils";

const ALLOWED_ROLES = new Set([
  "admin",
  "manager",
  "cashier",
  "chef",
  "waiter",
  "hr",
]);

/**
 * List active users filtered by role within the caller's branch.
 *
 * Used by the cashier's "New order" screen to pick a waiter, and (in the
 * future) by the kitchen dashboard to show on-duty chefs. Admins see users
 * across every branch; everyone else is scoped to their own branch.
 *
 * Query: `?role=waiter`
 */
export async function GET(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(req.url);
  const role = String(searchParams.get("role") || "").toLowerCase();
  if (!role || !ALLOWED_ROLES.has(role)) {
    return jsonError("role query param is required", 400);
  }

  await connectDB();

  const filter: Record<string, unknown> = {
    role,
    is_active: true,
    approval_status: "approved",
    email_verified: true,
  };
  if (!isAdmin(session.role) && session.branch?.id) {
    filter.branch_id = new mongoose.Types.ObjectId(session.branch.id);
  }

  const items = await User.find(filter)
    .select("name email role branch_id")
    .sort({ name: 1 })
    .limit(200)
    .lean();

  return jsonOk({
    items: items.map((u) => ({
      _id: String((u as { _id: unknown })._id),
      name: (u as { name: string }).name,
      email: (u as { email: string }).email,
      role: (u as { role: string }).role,
      branch_id: (u as { branch_id?: unknown }).branch_id
        ? String((u as { branch_id: unknown }).branch_id)
        : null,
    })),
  });
}
