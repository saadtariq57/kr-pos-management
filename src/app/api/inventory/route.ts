import { NextRequest } from "next/server";

import { jsonError, jsonOk, parseListQuery } from "@/app/api/_utils";
import { getSessionUserApproved } from "@/lib/auth-server";
import { parseInventoryUnit } from "@/lib/inventory-units";
import { connectDB } from "@/lib/mongodb";
import { canManageInventory } from "@/lib/rbac";
import { Inventory } from "@/models";

export async function GET(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session || !canManageInventory(session.role)) {
    return jsonError("Forbidden", 403);
  }

  await connectDB();
  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Inventory.find().sort({ raw_material_name: 1 }).skip(skip).limit(limit).lean(),
    Inventory.countDocuments(),
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

  const raw_material_name = String(body?.raw_material_name ?? "").trim();
  const quantity = Number(body?.quantity);
  const unit = parseInventoryUnit(body?.unit);

  if (!raw_material_name) {
    return jsonError("Material name is required");
  }
  if (!Number.isFinite(quantity) || quantity < 0) {
    return jsonError("Quantity must be a number ≥ 0");
  }
  if (!unit) {
    return jsonError('Unit must be one of: kg, liter, pcs (e.g. not "L" alone — use "liter")');
  }

  try {
    const record = await Inventory.create({
      raw_material_name,
      quantity,
      unit,
      reorder_level: body.reorder_level ?? 0,
      supplier_id: body.supplier_id ?? null,
    });
    return jsonOk({ ok: true, inventory: record });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create inventory record";
    return jsonError(msg, 400);
  }
}

