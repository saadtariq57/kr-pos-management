import { NextRequest } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Attendance } from "@/models";
import { jsonError, jsonOk, parseListQuery } from "@/app/api/_utils";

export async function GET(req: NextRequest) {
  await connectDB();
  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Attendance.find().sort({ attendance_date: -1 }).skip(skip).limit(limit).lean(),
    Attendance.countDocuments(),
  ]);

  return jsonOk({ items, page, limit, total });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  if (!body?.employee_id || !body?.attendance_date || !body?.status) {
    return jsonError("employee_id, attendance_date and status are required");
  }

  try {
    const record = await Attendance.create({
      employee_id: body.employee_id,
      check_in_time: body.check_in_time ?? null,
      check_out_time: body.check_out_time ?? null,
      attendance_date: body.attendance_date,
      status: body.status,
    });
    return jsonOk({ ok: true, attendance: record });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create attendance";
    return jsonError(msg, 400);
  }
}

