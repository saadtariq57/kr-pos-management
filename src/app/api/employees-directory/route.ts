import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { getSessionUserApproved } from "@/lib/auth-server";
import { connectDB } from "@/lib/mongodb";
import { canViewBranchEmployees } from "@/lib/rbac";
import { Employee, User } from "@/models";
import { jsonError, jsonOk, parseListQuery } from "@/app/api/_utils";

/**
 * GET /api/employees-directory
 *
 * Merged User + Employee + Branch view used by the "Employees" page.
 *
 * Access:
 *   - admin   → sees every user; honours `?branch_id=`, `?role=`, `?status=`
 *   - manager → forced to their own branch; honours `?role=`, `?status=`
 *
 * Each row pairs a User account (the source of truth for role / branch /
 * `last_login` / `is_active`) with the Employee HR profile (salary, hire date,
 * designation, department, phone, employment_status) if one is linked via
 * `Employee.user_id`. Users without an HR record return `hr: null` so the UI
 * can offer to create / link one.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session || !canViewBranchEmployees(session.role)) {
    return jsonError("Forbidden", 403);
  }

  const isAdmin = session.role === "admin";

  // A manager without a branch is a misconfigured account — bail out instead
  // of silently leaking every user in the system.
  if (!isAdmin && !session.branch) {
    return jsonError(
      "Your account is not attached to a branch. Ask an admin to fix this.",
      403,
    );
  }

  await connectDB();

  const url = new URL(req.url);
  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const roleFilter = String(url.searchParams.get("role") ?? "").trim().toLowerCase();
  const statusFilter = String(url.searchParams.get("status") ?? "").trim().toLowerCase();
  const requestedBranch = String(url.searchParams.get("branch_id") ?? "").trim();

  const filter: Record<string, unknown> = {};

  // Branch scope:
  //   manager → always pinned to their own branch
  //   admin   → optional ?branch_id filter, otherwise every branch (including
  //             admins themselves who have branch_id = null)
  if (!isAdmin) {
    filter.branch_id = new mongoose.Types.ObjectId(session.branch!.id);
  } else if (requestedBranch) {
    if (!mongoose.isValidObjectId(requestedBranch)) {
      return jsonError("Invalid branch_id", 400);
    }
    filter.branch_id = new mongoose.Types.ObjectId(requestedBranch);
  }

  if (roleFilter) {
    filter.role = roleFilter;
  }

  if (statusFilter === "active") filter.is_active = true;
  else if (statusFilter === "inactive") filter.is_active = false;

  // Managers must never see admin accounts, even if someone forges the
  // `?role=admin` query string. We override or augment the filter accordingly.
  if (!isAdmin) {
    if (filter.role === "admin") {
      return jsonOk({ items: [], page, limit, total: 0 });
    }
    if (!filter.role) {
      filter.role = { $ne: "admin" };
    }
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password_hash -email_verification_token -email_verification_expires")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "branch_id", select: "_id name city" })
      .lean(),
    User.countDocuments(filter),
  ]);

  const userIds = users.map((u) => u._id);
  const hrProfiles = userIds.length
    ? await Employee.find({ user_id: { $in: userIds } }).lean()
    : [];

  const hrByUserId = new Map<string, (typeof hrProfiles)[number]>();
  for (const hr of hrProfiles) {
    if (hr.user_id) hrByUserId.set(String(hr.user_id), hr);
  }

  const items = users.map((u) => {
    const branch =
      u.branch_id && typeof u.branch_id === "object" && "_id" in u.branch_id
        ? {
            id: String((u.branch_id as { _id: unknown })._id),
            name: String((u.branch_id as { name: string }).name),
            city: String((u.branch_id as { city: string }).city),
          }
        : null;

    const hr = hrByUserId.get(String(u._id));

    return {
      user_id: String(u._id),
      name: u.name,
      email: u.email,
      phone: hr?.phone || u.phone || "",
      role: u.role,
      is_active: u.is_active !== false,
      last_login: u.last_login ?? null,
      branch,
      hr: hr
        ? {
            employee_id: String(hr._id),
            phone: hr.phone,
            designation: hr.designation,
            department: hr.department,
            salary: hr.salary,
            hire_date: hr.hire_date,
            employment_status: hr.employment_status,
          }
        : null,
      created_at: u.created_at ?? null,
    };
  });

  return jsonOk({ items, page, limit, total });
}
