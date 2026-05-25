import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { getSessionUserApproved } from "@/lib/auth-server";
import { canViewBranchEmployees } from "@/lib/rbac";
import { connectDB } from "@/lib/mongodb";
import { Employee, User } from "@/models";
import { jsonError, jsonOk, parseListQuery } from "@/app/api/_utils";

export async function GET(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session || !canViewBranchEmployees(session.role)) {
    return jsonError("Forbidden", 403);
  }

  await connectDB();
  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Employee.find().sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
    Employee.countDocuments(),
  ]);

  return jsonOk({ items, page, limit, total });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session || !canViewBranchEmployees(session.role)) {
    return jsonError("Forbidden", 403);
  }

  await connectDB();
  const body = await req.json();

  if (
    !body?.name ||
    !body?.phone ||
    !body?.designation ||
    !body?.department ||
    body.salary == null ||
    !body?.hire_date ||
    !body?.employment_status
  ) {
    return jsonError(
      "name, phone, designation, department, salary, hire_date and employment_status are required",
    );
  }

  // Branch boundary safety checks
  if (session.role !== "admin" && !session.branch) {
    return jsonError("Your account is not attached to a branch.", 403);
  }

  if (body.user_id) {
    if (!mongoose.isValidObjectId(body.user_id)) {
      return jsonError("Invalid user_id", 400);
    }
    const targetUser = await User.findById(body.user_id);
    if (!targetUser) {
      return jsonError("User not found", 404);
    }
    if (session.role !== "admin" && String(targetUser.branch_id) !== String(session.branch?.id)) {
      return jsonError("Forbidden: User belongs to another branch", 403);
    }
  }

  try {
    let employee;
    if (body.user_id) {
      const existing = await Employee.findOne({ user_id: body.user_id });
      if (existing) {
        existing.name = body.name;
        existing.email = body.email || existing.email || null;
        existing.phone = body.phone;
        existing.designation = body.designation;
        existing.department = body.department;
        existing.salary = body.salary;
        existing.hire_date = body.hire_date;
        existing.employment_status = body.employment_status;
        if (session.role === "admin") {
          existing.branch_id = body.branch_id ? new mongoose.Types.ObjectId(body.branch_id) : (existing.branch_id || null);
        } else {
          existing.branch_id = new mongoose.Types.ObjectId(session.branch!.id);
        }
        await existing.save();
        employee = existing;
      }
    }

    if (!employee) {
      employee = await Employee.create({
        name: body.name,
        email: body.email || null,
        phone: body.phone,
        designation: body.designation,
        department: body.department,
        salary: body.salary,
        hire_date: body.hire_date,
        employment_status: body.employment_status,
        user_id: body.user_id || null,
        branch_id: session.role === "admin"
          ? (body.branch_id ? new mongoose.Types.ObjectId(body.branch_id) : null)
          : new mongoose.Types.ObjectId(session.branch!.id),
      });
    }

    return jsonOk({ ok: true, employee });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save employee profile";
    return jsonError(msg, 400);
  }
}

