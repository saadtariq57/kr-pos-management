export const INVENTORY_UNITS = ["kg", "liter", "pcs"] as const;
export type InventoryUnit = (typeof INVENTORY_UNITS)[number];

/** Maps UI / common aliases to a valid stored unit. */
export function parseInventoryUnit(value: unknown): InventoryUnit | null {
  const s = String(value ?? "").trim().toLowerCase();
  if ((INVENTORY_UNITS as readonly string[]).includes(s)) return s as InventoryUnit;
  if (["l", "ltr", "litre", "litres"].includes(s)) return "liter";
  if (["pc", "piece", "pieces", "unit", "units"].includes(s)) return "pcs";
  if (["kilogram", "kilograms", "kgs"].includes(s)) return "kg";
  return null;
}
