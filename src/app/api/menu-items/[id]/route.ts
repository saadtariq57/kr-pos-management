import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { jsonError, jsonOk } from "@/app/api/_utils";
import { getSessionUserApproved } from "@/lib/auth-server";
import { connectDB } from "@/lib/mongodb";
import { canManageInventory } from "@/lib/rbac";
import { MenuItem } from "@/models";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSessionUserApproved();
  if (!session || !canManageInventory(session.role)) {
    return jsonError("Forbidden", 403);
  }

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) {
    return jsonError("Invalid menu item id", 400);
  }

  const body = await req.json();
  const $set: Record<string, unknown> = {};

  if (body.category_id != null) {
    if (!mongoose.isValidObjectId(String(body.category_id))) {
      return jsonError("Invalid category_id", 400);
    }
    $set.category_id = body.category_id;
  }
  if (body.item_name != null) {
    const name = String(body.item_name).trim();
    if (!name) return jsonError("item_name cannot be empty", 400);
    $set.item_name = name;
  }
  if (body.description != null) {
    $set.description = String(body.description);
  }
  if (body.price != null) {
    const p = Number(body.price);
    if (!Number.isFinite(p) || p < 0) return jsonError("price must be a number ≥ 0", 400);
    $set.price = p;
  }
  if (body.cost_price != null) {
    const c = Number(body.cost_price);
    if (!Number.isFinite(c) || c < 0) return jsonError("cost_price must be a number ≥ 0", 400);
    $set.cost_price = c;
  }
  if (body.availability_status != null) {
    $set.availability_status = String(body.availability_status).trim() || "available";
  }
  if (body.image_url !== undefined) {
    $set.image_url = body.image_url === null || body.image_url === "" ? null : String(body.image_url);
  }

  if (Object.keys($set).length === 0) {
    return jsonError("No valid fields to update", 400);
  }

  await connectDB();
  const item = await MenuItem.findByIdAndUpdate(id, { $set }, { new: true }).lean();
  if (!item) {
    return jsonError("Menu item not found", 404);
  }

  return jsonOk({ ok: true, item });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSessionUserApproved();
  if (!session || !canManageInventory(session.role)) {
    return jsonError("Forbidden", 403);
  }

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) {
    return jsonError("Invalid menu item id", 400);
  }

  await connectDB();
  const removed = await MenuItem.findByIdAndDelete(id).select("_id").lean();
  if (!removed) {
    return jsonError("Menu item not found", 404);
  }

  return jsonOk({ ok: true });
}
