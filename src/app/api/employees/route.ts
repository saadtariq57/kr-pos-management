import { NextRequest } from "next/server";

import { getSessionUserApproved } from "@/lib/auth-server";
import { canManageStaffUsers } from "@/lib/rbac";
import { connectDB } from "@/lib/mongodb";
import { Employee } from "@/models";
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
    Employee.find().sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
    Employee.countDocuments(),
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

  try {
    const employee = await Employee.create({
      name: body.name,
      email: body.email ?? null,
      phone: body.phone,
      designation: body.designation,
      department: body.department,
      salary: body.salary,
      hire_date: body.hire_date,
      employment_status: body.employment_status,
    });
    return jsonOk({ ok: true, employee });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create employee";
    return jsonError(msg, 400);
  }
}

