import { NextRequest } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { SalesSummary } from "@/models";
import { jsonError, jsonOk, parseListQuery } from "@/app/api/_utils";

export async function GET(req: NextRequest) {
  await connectDB();
  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    SalesSummary.find().sort({ date: -1 }).skip(skip).limit(limit).lean(),
    SalesSummary.countDocuments(),
  ]);

  return jsonOk({ items, page, limit, total });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  if (!body?.date) {
    return jsonError("date is required");
  }

  try {
    const summary = await SalesSummary.create({
      date: body.date,
      total_orders: body.total_orders ?? 0,
      total_revenue: body.total_revenue ?? 0,
      total_tax: body.total_tax ?? 0,
      total_discount: body.total_discount ?? 0,
      net_profit: body.net_profit ?? 0,
    });
    return jsonOk({ ok: true, summary });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Failed to create sales summary";
    return jsonError(msg, 400);
  }
}

