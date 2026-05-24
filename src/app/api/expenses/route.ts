import { NextRequest } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Expense } from "@/models";
import { jsonError, jsonOk, parseListQuery } from "@/app/api/_utils";

export async function GET(req: NextRequest) {
  await connectDB();
  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Expense.find().sort({ expense_date: -1 }).skip(skip).limit(limit).lean(),
    Expense.countDocuments(),
  ]);

  return jsonOk({ items, page, limit, total });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  if (!body?.expense_type || body.amount == null || !body?.expense_date) {
    return jsonError("expense_type, amount and expense_date are required");
  }

  try {
    const expense = await Expense.create({
      expense_type: body.expense_type,
      amount: body.amount,
      description: body.description ?? "",
      expense_date: body.expense_date,
    });
    return jsonOk({ ok: true, expense });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create expense";
    return jsonError(msg, 400);
  }
}

