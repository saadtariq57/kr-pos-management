import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { jsonError, jsonOk } from "@/app/api/_utils";
import { getSessionUserApproved } from "@/lib/auth-server";
import { parseInventoryUnit } from "@/lib/inventory-units";
import { connectDB } from "@/lib/mongodb";
import { canManageInventory } from "@/lib/rbac";
import { Inventory } from "@/models";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSessionUserApproved();
  if (!session || !canManageInventory(session.role)) {
    return jsonError("Forbidden", 403);
  }

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) {
    return jsonError("Invalid inventory id", 400);
  }

  const body = await req.json();
  const $set: Record<string, unknown> = {};

  if (body.raw_material_name != null) {
    const name = String(body.raw_material_name).trim();
    if (!name) return jsonError("raw_material_name cannot be empty", 400);
    $set.raw_material_name = name;
  }
  if (body.quantity != null) {
    const q = Number(body.quantity);
    if (!Number.isFinite(q) || q < 0) {
      return jsonError("quantity must be a number ≥ 0", 400);
    }
    $set.quantity = q;
  }
  if (body.unit != null) {
    const u = parseInventoryUnit(body.unit);
    if (!u) {
      return jsonError("unit must be kg, liter, or pcs", 400);
    }
    $set.unit = u;
  }
  if (body.reorder_level != null) {
    const r = Number(body.reorder_level);
    if (!Number.isFinite(r) || r < 0) {
      return jsonError("reorder_level must be a number ≥ 0", 400);
    }
    $set.reorder_level = r;
  }
  if (body.supplier_id !== undefined) {
    if (body.supplier_id === null || body.supplier_id === "") {
      $set.supplier_id = null;
    } else if (mongoose.isValidObjectId(String(body.supplier_id))) {
      $set.supplier_id = body.supplier_id;
    } else {
      return jsonError("Invalid supplier_id", 400);
    }
  }

  if (Object.keys($set).length === 0) {
    return jsonError("No valid fields to update", 400);
  }

  $set.last_updated = new Date();

  await connectDB();
  const record = await Inventory.findByIdAndUpdate(id, { $set }, { new: true }).lean();
  if (!record) {
    return jsonError("Inventory record not found", 404);
  }

  return jsonOk({ ok: true, inventory: record });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSessionUserApproved();
  if (!session || !canManageInventory(session.role)) {
    return jsonError("Forbidden", 403);
  }

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) {
    return jsonError("Invalid inventory id", 400);
  }

  await connectDB();
  const removed = await Inventory.findByIdAndDelete(id).select("_id").lean();
  if (!removed) {
    return jsonError("Inventory record not found", 404);
  }

  return jsonOk({ ok: true });
}
