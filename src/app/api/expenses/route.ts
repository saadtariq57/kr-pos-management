import { NextRequest } from "next/server";

import { getSessionUserApproved } from "@/lib/auth-server";
import { connectDB } from "@/lib/mongodb";
import { isAdmin } from "@/lib/rbac";
import { Expense } from "@/models";
import { jsonError, jsonOk, parseListQuery } from "@/app/api/_utils";

export async function GET(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  await connectDB();
  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const { searchParams } = new URL(req.url);
  const branchIdParam = searchParams.get("branch_id");
  const monthParam = searchParams.get("month");

  // Build query filter
  const filter: Record<string, any> = {};

  if (isAdmin(session.role)) {
    if (branchIdParam && branchIdParam !== "all" && branchIdParam.trim() !== "") {
      filter.branch_id = branchIdParam;
    }
  } else {
    if (session.branch?.id) {
      filter.branch_id = session.branch.id;
    } else {
      // Non-admin without a branch cannot access/view any expenses
      return jsonOk({ items: [], page, limit, total: 0 });
    }
  }

  // Month filtering (format: YYYY-MM)
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [yearStr, monthStr] = monthParam.split("-");
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    if (!isNaN(y) && !isNaN(m)) {
      const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
      filter.expense_date = { $gte: start, $lt: end };
    }
  }

  const [items, total] = await Promise.all([
    Expense.find(filter)
      .sort({ expense_date: -1 })
      .skip(skip)
      .limit(limit)
      .populate("branch_id", "name city")
      .lean(),
    Expense.countDocuments(filter),
  ]);

  return jsonOk({ items, page, limit, total });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  await connectDB();
  const body = await req.json();

  if (!body?.expense_type || body.amount == null || !body?.expense_date) {
    return jsonError("expense_type, amount and expense_date are required");
  }

  let branch_id: string;
  if (isAdmin(session.role)) {
    if (!body?.branch_id) {
      return jsonError("branch_id is required for admins");
    }
    branch_id = body.branch_id;
  } else {
    if (!session.branch?.id) {
      return jsonError("Manager has no associated branch", 400);
    }
    branch_id = session.branch.id;
  }

  try {
    const expense = await Expense.create({
      branch_id,
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

