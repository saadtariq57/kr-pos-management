import { NextRequest } from "next/server";

import { getSessionUserApproved } from "@/lib/auth-server";
import { connectDB } from "@/lib/mongodb";
import { Customer } from "@/models";
import { jsonError, jsonOk, parseListQuery } from "@/app/api/_utils";

export async function GET(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  await connectDB();
  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Customer.find().sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
    Customer.countDocuments(),
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

  if (!body?.name || !body?.phone) {
    return jsonError("name and phone are required");
  }

  try {
    const customer = await Customer.create({
      name: body.name,
      phone: body.phone,
      email: body.email ?? null,
    });
    return jsonOk({ ok: true, customer });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create customer";
    return jsonError(msg, 400);
  }
}

