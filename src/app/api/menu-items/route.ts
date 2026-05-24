import { NextRequest } from "next/server";

import { getSessionUserApproved } from "@/lib/auth-server";
import { canManageInventory } from "@/lib/rbac";
import { connectDB } from "@/lib/mongodb";
import { MenuItem } from "@/models";
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
  const categoryId = searchParams.get("categoryId");

  const filter: Record<string, unknown> = {};
  if (categoryId) {
    filter.category_id = categoryId;
  }

  const [items, total] = await Promise.all([
    MenuItem.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    MenuItem.countDocuments(filter),
  ]);

  return jsonOk({ items, page, limit, total });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session || !canManageInventory(session.role)) {
    return jsonError("Forbidden", 403);
  }

  await connectDB();
  const body = await req.json();

  if (!body?.category_id || !body?.item_name || body.price == null) {
    return jsonError("category_id, item_name and price are required");
  }

  try {
    const item = await MenuItem.create({
      category_id: body.category_id,
      item_name: body.item_name,
      description: body.description ?? "",
      price: body.price,
      cost_price: body.cost_price ?? body.price,
      availability_status: body.availability_status ?? "available",
      image_url: body.image_url ?? null,
    });
    return jsonOk({ ok: true, item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create menu item";
    return jsonError(msg, 400);
  }
}

