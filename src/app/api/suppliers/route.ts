import { NextRequest } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Supplier } from "@/models";
import { jsonError, jsonOk, parseListQuery } from "@/app/api/_utils";

export async function GET(req: NextRequest) {
  await connectDB();
  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Supplier.find().sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
    Supplier.countDocuments(),
  ]);

  return jsonOk({ items, page, limit, total });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  if (!body?.supplier_name || !body?.contact_number || !body?.address) {
    return jsonError("supplier_name, contact_number and address are required");
  }

  try {
    const supplier = await Supplier.create({
      supplier_name: body.supplier_name,
      contact_number: body.contact_number,
      address: body.address,
    });
    return jsonOk({ ok: true, supplier });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create supplier";
    return jsonError(msg, 400);
  }
}

