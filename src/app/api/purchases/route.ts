import { NextRequest } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Purchase } from "@/models";
import { jsonError, jsonOk, parseListQuery } from "@/app/api/_utils";

export async function GET(req: NextRequest) {
  await connectDB();
  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Purchase.find().sort({ purchase_date: -1 }).skip(skip).limit(limit).lean(),
    Purchase.countDocuments(),
  ]);

  return jsonOk({ items, page, limit, total });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  if (!body?.supplier_id || body.total_cost == null) {
    return jsonError("supplier_id and total_cost are required");
  }

  try {
    const purchase = await Purchase.create({
      supplier_id: body.supplier_id,
      items: Array.isArray(body.items) ? body.items : [],
      total_cost: body.total_cost,
      purchase_date: body.purchase_date ?? new Date(),
    });
    return jsonOk({ ok: true, purchase });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create purchase";
    return jsonError(msg, 400);
  }
}

