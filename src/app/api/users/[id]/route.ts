import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { verifyAdminPassword } from "@/lib/admin-password";
import { getSessionUserApproved } from "@/lib/auth-server";
import {
  canDeleteEmployee,
  canManageStaffUsers,
} from "@/lib/rbac";
import { connectDB } from "@/lib/mongodb";
import {
  AnalyticsLog,
  Attendance,
  Employee,
  Order,
  Payroll,
  User,
} from "@/models";
import { jsonError, jsonOk } from "@/app/api/_utils";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Remove a user account (admin only). Hard-delete is FK-guarded: if the user
 * has historical Orders / Payroll / Attendance records we 409 and force the
 * caller to soft-delete (PATCH `{ action: "deactivate" }`) instead. The HR
 * Employee profile linked via `user_id` is deleted alongside.
 *
 * Body: { password: string }
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const session = await getSessionUserApproved();
  if (!session || !canDeleteEmployee(session.role)) {
    return jsonError("Forbidden", 403);
  }

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) {
    return jsonError("Invalid user id", 400);
  }

  if (id === session.id) {
    return jsonError("You cannot delete your own account", 400);
  }

  await connectDB();

  let password = "";
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
  } catch {
    // Body is optional for parsing safety; we'll fail below if missing.
  }

  const passwordOk = await verifyAdminPassword(session.id, password);
  if (!passwordOk) {
    return jsonError("Admin password is incorrect", 401);
  }

  const target = await User.findById(id).select("_id role").lean<{
    _id: unknown;
    role: string;
  } | null>();
  if (!target) {
    return jsonError("User not found", 404);
  }

  const linkedEmployee = await Employee.findOne({ user_id: id })
    .select("_id")
    .lean<{ _id: unknown } | null>();

  const [orderCount, payrollCount, attendanceCount] = await Promise.all([
    Order.countDocuments({ staff_id: id }),
    linkedEmployee
      ? Payroll.countDocuments({ employee_id: linkedEmployee._id })
      : Promise.resolve(0),
    linkedEmployee
      ? Attendance.countDocuments({ employee_id: linkedEmployee._id })
      : Promise.resolve(0),
  ]);

  if (orderCount + payrollCount + attendanceCount > 0) {
    return jsonError(
      "Cannot hard-delete: this user has historical orders or HR records. Deactivate them instead.",
      409,
    );
  }

  await User.findByIdAndDelete(id);
  if (linkedEmployee) {
    await Employee.findByIdAndDelete(linkedEmployee._id);
  }

  // Audit log — never throw if logging fails.
  try {
    await AnalyticsLog.create({
      user_id: session.id,
      activity_type: "user.delete",
      metadata: { deleted_user_id: id, role: target.role },
    });
  } catch {
    /* ignore */
  }

  return jsonOk({ ok: true });
}

/**
 * PATCH /api/users/:id
 *
 * Two flows, distinguished by the body shape:
 *
 *   1. { action: "activate" | "deactivate" }
 *        → flips `is_active`. Admin only. Self-action blocked.
 *
 *   2. { approval_status: "approved" }
 *        → legacy approval flow (admin only).
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSessionUserApproved();
  if (!session || !canManageStaffUsers(session.role)) {
    return jsonError("Forbidden", 403);
  }

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) {
    return jsonError("Invalid user id", 400);
  }

  const body = await req.json();

  if (body?.action === "activate" || body?.action === "deactivate") {
    if (id === session.id) {
      return jsonError("You cannot change your own active status", 400);
    }

    await connectDB();
    const nextActive = body.action === "activate";
    const user = await User.findByIdAndUpdate(
      id,
      { is_active: nextActive },
      { new: true },
    )
      .select("-password_hash")
      .lean();

    if (!user) {
      return jsonError("User not found", 404);
    }

    return jsonOk({ ok: true, user });
  }

  if (body?.approval_status === "approved") {
    await connectDB();
    const user = await User.findByIdAndUpdate(
      id,
      { approval_status: "approved" },
      { new: true },
    )
      .select("-password_hash")
      .lean();

    if (!user) {
      return jsonError("User not found", 404);
    }

    return jsonOk({ ok: true, user });
  }

  return jsonError("Unrecognized PATCH body", 400);
}
