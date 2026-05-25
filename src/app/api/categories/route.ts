import { NextRequest } from "next/server";

import { getSessionUserApproved } from "@/lib/auth-server";
import { canManageInventory } from "@/lib/rbac";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models";
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
    Category.find().sort({ category_name: 1 }).skip(skip).limit(limit).lean(),
    Category.countDocuments(),
  ]);

  return jsonOk({ items, page, limit, total });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session || session.role !== "admin") {
    return jsonError("Only admins can add categories to the menu", 403);
  }

  await connectDB();
  const body = await req.json();

  if (!body?.category_name) {
    return jsonError("category_name is required");
  }

  try {
    const category = await Category.create({
      category_name: body.category_name,
      description: body.description ?? "",
      is_active: body.is_active ?? true,
    });
    return jsonOk({ ok: true, category });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create category";
    return jsonError(msg, 400);
  }
}

