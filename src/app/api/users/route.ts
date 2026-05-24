import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { getSessionUserApproved } from "@/lib/auth-server";
import { APP_ROLES, canManageStaffUsers, roleRequiresBranch } from "@/lib/rbac";
import { connectDB } from "@/lib/mongodb";
import { Branch, User } from "@/models";
import { jsonError, jsonOk, parseListQuery } from "@/app/api/_utils";

export async function GET(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session || !canManageStaffUsers(session.role)) {
    return jsonError("Forbidden", 403);
  }

  await connectDB();
  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    User.find()
      .select("-password_hash")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(),
  ]);

  return jsonOk({ items, page, limit, total });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session || !canManageStaffUsers(session.role)) {
    return jsonError("Forbidden", 403);
  }

  await connectDB();
  const body = await req.json();
  const name = String(body?.name ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const role = String(body?.role ?? "").trim().toLowerCase();

  if (!name || !phone || !role) {
    return jsonError("name, phone and role are required");
  }

  if (!APP_ROLES.includes(role as (typeof APP_ROLES)[number])) {
    return jsonError(`role must be one of ${APP_ROLES.join(", ")}`);
  }

  let branchId: mongoose.Types.ObjectId | null = null;
  if (roleRequiresBranch(role)) {
    const raw = String(body?.branch_id ?? "").trim();
    if (!raw || !mongoose.isValidObjectId(raw)) {
      return jsonError("Please select a branch for this role");
    }

    const branch = await Branch.findById(raw).select("_id is_active").lean<{
      _id: mongoose.Types.ObjectId;
      is_active: boolean;
    } | null>();
    if (!branch) return jsonError("Selected branch does not exist");
    if (!branch.is_active) return jsonError("Selected branch is currently deactivated");
    branchId = branch._id;
  }

  // Waiters are roster entries used only for assigning orders — they don't
  // log in, so we skip email/password entirely. Every other role gets the
  // standard credential pair.
  const isLoginRole = role !== "waiter";
  let email: string | undefined;
  let password_hash: string | null = null;
  if (isLoginRole) {
    email = String(body?.email ?? "").trim().toLowerCase();
    if (!email) return jsonError("email is required for this role");

    password_hash =
      body?.password_hash ??
      (body?.password ? await bcrypt.hash(String(body.password), 10) : null);
    if (!password_hash) {
      return jsonError("password is required for this role");
    }
  }

  try {
    const doc: Record<string, unknown> = {
      name,
      phone,
      role,
      branch_id: branchId,
      is_active: body.is_active ?? true,
      approval_status: "approved",
      email_verified: true,
      email_verified_at: new Date(),
    };
    if (email) doc.email = email;
    if (password_hash) doc.password_hash = password_hash;

    const user = await User.create(doc);
    const safe = await User.findById(user._id).select("-password_hash").lean();
    return jsonOk({ ok: true, user: safe });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create user";
    return jsonError(msg, 400);
  }
}

