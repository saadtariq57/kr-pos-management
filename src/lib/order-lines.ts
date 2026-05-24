import mongoose from "mongoose";

import { MenuItem } from "@/models";

export type RawOrderLine = { menu_item_id: string; quantity: number };

export type ResolvedOrderLine = {
  menu_item_id: mongoose.Types.ObjectId;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_name: string;
};

export async function resolveMenuOrderLines(
  rawItems: RawOrderLine[],
): Promise<
  | { ok: true; lines: ResolvedOrderLine[]; subtotal_amount: number }
  | { ok: false; error: string }
> {
  if (rawItems.length === 0) {
    return { ok: false, error: "At least one menu item is required" };
  }

  const lines: { menu_item_id: mongoose.Types.ObjectId; quantity: number }[] =
    [];
  for (const row of rawItems) {
    const id = String(row?.menu_item_id ?? "");
    const qty = Math.floor(Number(row?.quantity ?? 0));
    if (!mongoose.isValidObjectId(id) || qty < 1) {
      return {
        ok: false,
        error: "Each item needs a valid menu_item_id and quantity >= 1",
      };
    }
    lines.push({
      menu_item_id: new mongoose.Types.ObjectId(id),
      quantity: qty,
    });
  }

  const menuIds = [...new Set(lines.map((l) => l.menu_item_id.toString()))];
  const menuDocs = await MenuItem.find({
    _id: { $in: menuIds },
  }).lean();

  if (menuDocs.length !== menuIds.length) {
    return { ok: false, error: "One or more menu items were not found" };
  }

  const priceById = new Map<
    string,
    { name: string; price: number; status: string }
  >();
  for (const m of menuDocs) {
    const doc = m as {
      _id: mongoose.Types.ObjectId;
      item_name: string;
      price: number;
      availability_status?: string;
    };
    if (doc.availability_status === "unavailable") {
      return { ok: false, error: `Item "${doc.item_name}" is unavailable` };
    }
    priceById.set(String(doc._id), {
      name: doc.item_name,
      price: doc.price,
      status: doc.availability_status ?? "available",
    });
  }

  let subtotal_amount = 0;
  const resolvedLines: ResolvedOrderLine[] = [];

  for (const line of lines) {
    const key = line.menu_item_id.toString();
    const meta = priceById.get(key);
    if (!meta) return { ok: false, error: "Invalid menu item" };
    const unit_price = meta.price;
    const total_price = Math.round(unit_price * line.quantity * 100) / 100;
    subtotal_amount += total_price;
    resolvedLines.push({
      menu_item_id: line.menu_item_id,
      quantity: line.quantity,
      unit_price,
      total_price,
      item_name: meta.name,
    });
  }

  subtotal_amount = Math.round(subtotal_amount * 100) / 100;
  return { ok: true, lines: resolvedLines, subtotal_amount };
}

export function computeTaxAndFinal(
  subtotal_amount: number,
  discount_amount: number,
  tax_rate: number,
) {
  const discount = Math.max(0, discount_amount);
  const rate = Math.min(1, Math.max(0, tax_rate));
  const afterDiscount = Math.max(0, subtotal_amount - discount);
  const tax_amount = Math.round(afterDiscount * rate * 100) / 100;
  const final_amount = Math.round((afterDiscount + tax_amount) * 100) / 100;
  return { discount_amount: discount, tax_amount, final_amount };
}
