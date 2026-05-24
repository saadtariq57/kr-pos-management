import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { verifyAdminPassword } from "@/lib/admin-password";
import { getSessionUserApproved } from "@/lib/auth-server";
import { connectDB } from "@/lib/mongodb";
import { canManageBranches } from "@/lib/rbac";
import { Branch, User } from "@/models";
import { jsonError, jsonOk } from "@/app/api/_utils";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/branches/:id
 *
 * Toggle a branch's active state. Requires the admin's current password to
 * confirm the action. Deactivating a branch cascades and disables every
 * non-admin user attached to it (records are preserved for history; users
 * are simply locked out of login until the branch is reactivated and the
 * admin manually re-enables them from the Users page).
 *
 * Body: { action: "activate" | "deactivate", password: string, ...edits }
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSessionUserApproved();
  if (!session || !canManageBranches(session.role)) {
    return jsonError("Forbidden", 403);
  }

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) {
    return jsonError("Invalid branch id", 400);
  }

  await connectDB();
  const body = await req.json();
  const action = String(body?.action ?? "").toLowerCase();
  const password = String(body?.password ?? "");

  const branch = await Branch.findById(id);
  if (!branch) return jsonError("Branch not found", 404);

  if (action === "activate" || action === "deactivate") {
    const ok = await verifyAdminPassword(session.id, password);
    if (!ok) {
      return jsonError("Admin password is incorrect", 401);
    }

    const nextActive = action === "activate";
    branch.is_active = nextActive;
    branch.deactivated_at = nextActive ? null : new Date();
    await branch.save();

    let cascadedUsers = 0;
    if (!nextActive) {
      const result = await User.updateMany(
        { branch_id: branch._id, role: { $ne: "admin" }, is_active: true },
        { $set: { is_active: false } },
      );
      cascadedUsers = result.modifiedCount ?? 0;
    }

    return jsonOk({
      ok: true,
      branch,
      cascaded_users_deactivated: cascadedUsers,
    });
  }

  // Plain metadata edit (no password required).
  const updates: Record<string, unknown> = {};
  if (typeof body?.name === "string") updates.name = body.name.trim();
  if (typeof body?.city === "string") updates.city = body.city.trim();
  if (typeof body?.address === "string") updates.address = body.address.trim();
  if (typeof body?.phone === "string") updates.phone = body.phone.trim();
  if (Object.keys(updates).length === 0) {
    return jsonError("No valid fields to update");
  }

  Object.assign(branch, updates);
  await branch.save();
  return jsonOk({ ok: true, branch });
}

/**
 * DELETE /api/branches/:id
 *
 * Hard delete — only allowed when nobody is attached to the branch.
 * Use the PATCH deactivate flow for any branch that actually operated.
 * Requires the admin's password in a JSON body: { password: string }.
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const session = await getSessionUserApproved();
  if (!session || !canManageBranches(session.role)) {
    return jsonError("Forbidden", 403);
  }

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) {
    return jsonError("Invalid branch id", 400);
  }

  await connectDB();

  let password = "";
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
  } catch {
    // Body is optional for parsing safety; we'll fail below if missing.
  }

  const ok = await verifyAdminPassword(session.id, password);
  if (!ok) {
    return jsonError("Admin password is incorrect", 401);
  }

  const attachedUsers = await User.countDocuments({ branch_id: id });
  if (attachedUsers > 0) {
    return jsonError(
      "Cannot delete: users are still attached to this branch. Deactivate it instead.",
      409,
    );
  }

  const removed = await Branch.findByIdAndDelete(id).select("_id").lean();
  if (!removed) return jsonError("Branch not found", 404);
  return jsonOk({ ok: true });
}
