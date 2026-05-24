import { NextRequest } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Payroll } from "@/models";
import { jsonError, jsonOk, parseListQuery } from "@/app/api/_utils";

export async function GET(req: NextRequest) {
  await connectDB();
  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Payroll.find().sort({ payment_date: -1 }).skip(skip).limit(limit).lean(),
    Payroll.countDocuments(),
  ]);

  return jsonOk({ items, page, limit, total });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  if (
    !body?.employee_id ||
    body.basic_salary == null ||
    body.net_salary == null ||
    !body?.payment_date
  ) {
    return jsonError(
      "employee_id, basic_salary, net_salary and payment_date are required",
    );
  }

  try {
    const payroll = await Payroll.create({
      employee_id: body.employee_id,
      basic_salary: body.basic_salary,
      bonus: body.bonus ?? 0,
      deductions: body.deductions ?? 0,
      net_salary: body.net_salary,
      payment_date: body.payment_date,
    });
    return jsonOk({ ok: true, payroll });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create payroll";
    return jsonError(msg, 400);
  }
}

