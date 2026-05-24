"use client";

import * as React from "react";
import { AlertCircle, Boxes } from "lucide-react";

import { PageHeader } from "@/components/pages/PageHeader";
import { SlimTable } from "@/components/pages/SlimTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiDelete, apiPatch, apiPost } from "@/lib/api-client";
import { INVENTORY_UNITS } from "@/lib/inventory-units";
import { useApiList } from "@/lib/useApiList";

type InventoryRow = {
  _id: string;
  raw_material_name: string;
  quantity: number;
  unit: string;
};
type SupplierRow = {
  _id: string;
  supplier_name: string;
  contact_number: string;
};

export default function InventoryPage() {
  const inventory = useApiList<InventoryRow>("/api/inventory?limit=30");
  const suppliers = useApiList<SupplierRow>("/api/suppliers?limit=30");
  const { toast } = useToast();
  const confirm = useConfirm();

  const [material, setMaterial] = React.useState("");
  const [qty, setQty] = React.useState("0");
  const [unit, setUnit] = React.useState<(typeof INVENTORY_UNITS)[number]>("pcs");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [supplierName, setSupplierName] = React.useState("");
  const [supplierContact, setSupplierContact] = React.useState("");
  const [supplierAddress, setSupplierAddress] = React.useState("");
  const [supplierFormError, setSupplierFormError] = React.useState<string | null>(
    null,
  );
  const [savingSupplier, setSavingSupplier] = React.useState(false);

  function resetInventoryForm() {
    setEditingId(null);
    setMaterial("");
    setQty("0");
    setUnit("pcs");
    setFormError(null);
  }

  function startEdit(row: InventoryRow) {
    setFormError(null);
    setEditingId(row._id);
    setMaterial(row.raw_material_name);
    setQty(String(row.quantity));
    const u = (INVENTORY_UNITS as readonly string[]).includes(row.unit)
      ? (row.unit as (typeof INVENTORY_UNITS)[number])
      : "pcs";
    setUnit(u);
  }

  async function saveInventory() {
    setFormError(null);
    const name = material.trim();
    if (!name) {
      setFormError("Enter a material name.");
      return;
    }
    const q = Number(qty);
    if (!Number.isFinite(q) || q < 0) {
      setFormError("Quantity must be a number ≥ 0.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await apiPatch(`/api/inventory/${editingId}`, {
          raw_material_name: name,
          quantity: q,
          unit,
          reorder_level: 0,
        });
        toast({ title: "Stock updated", tone: "success" });
      } else {
        await apiPost("/api/inventory", {
          raw_material_name: name,
          quantity: q,
          unit,
          reorder_level: 0,
        });
        toast({ title: "Stock added", tone: "success" });
      }
      resetInventoryForm();
      await inventory.reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save inventory.");
    } finally {
      setSaving(false);
    }
  }

  function resetSupplierForm() {
    setSupplierName("");
    setSupplierContact("");
    setSupplierAddress("");
    setSupplierFormError(null);
  }

  async function saveSupplier() {
    setSupplierFormError(null);
    const name = supplierName.trim();
    const contact = supplierContact.trim();
    const address = supplierAddress.trim();
    if (!name) {
      setSupplierFormError("Enter a supplier name.");
      return;
    }
    if (!contact) {
      setSupplierFormError("Enter a contact number.");
      return;
    }
    if (!address) {
      setSupplierFormError("Enter an address.");
      return;
    }
    setSavingSupplier(true);
    try {
      await apiPost("/api/suppliers", {
        supplier_name: name,
        contact_number: contact,
        address,
      });
      toast({ title: "Supplier added", tone: "success" });
      resetSupplierForm();
      await suppliers.reload();
    } catch (e) {
      setSupplierFormError(
        e instanceof Error ? e.message : "Could not save supplier.",
      );
    } finally {
      setSavingSupplier(false);
    }
  }

  async function deleteInventoryRow(id: string, label: string) {
    const ok = await confirm({
      title: `Remove "${label}"?`,
      description: "This material will be removed from inventory.",
      destructive: true,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    setFormError(null);
    try {
      await apiDelete(`/api/inventory/${id}`);
      if (editingId === id) resetInventoryForm();
      await inventory.reload();
      toast({ title: "Removed" });
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Could not delete inventory.",
      );
    }
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Inventory"
        title="Inventory &amp; stock"
        description="Track raw materials and the suppliers who keep them flowing."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[14px] font-semibold tracking-[-0.005em]">
                  Inventory
                </div>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                  Add a material or update an existing entry.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {editingId ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={resetInventoryForm}
                  >
                    Cancel edit
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  disabled={saving}
                  onClick={() => void saveInventory()}
                >
                  {saving
                    ? "Saving…"
                    : editingId
                      ? "Save changes"
                      : "Add stock"}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5 sm:col-span-3">
                <Label>Material</Label>
                <Input
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="Flour, Tomato sauce…"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Unit</Label>
                <Select
                  value={unit}
                  onValueChange={(v) =>
                    setUnit(v as (typeof INVENTORY_UNITS)[number])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVENTORY_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formError ? (
              <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            ) : null}

            {inventory.loading && !inventory.data ? (
              <Skeleton className="h-32 w-full" />
            ) : (inventory.data?.items ?? []).length === 0 ? (
              <EmptyState
                icon={<Boxes className="size-4" />}
                title="No inventory yet"
                description="Add your first material to begin tracking stock."
              />
            ) : (
              <SlimTable<InventoryRow>
                rowKey={(r) => r._id}
                columns={[
                  {
                    key: "m",
                    header: "Material",
                    cell: (r) => (
                      <span className="font-medium">{r.raw_material_name}</span>
                    ),
                  },
                  {
                    key: "q",
                    header: "Qty",
                    align: "right",
                    cell: (r) => (
                      <span className="tabular-nums">{r.quantity}</span>
                    ),
                  },
                  {
                    key: "u",
                    header: "Unit",
                    cell: (r) => (
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {r.unit}
                      </span>
                    ),
                  },
                  {
                    key: "act",
                    header: "",
                    align: "right",
                    cell: (r) => (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(r)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                          onClick={() =>
                            void deleteInventoryRow(r._id, r.raw_material_name)
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    ),
                  },
                ]}
                rows={inventory.data?.items ?? []}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[14px] font-semibold tracking-[-0.005em]">
                  Suppliers
                </div>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                  A quick directory of your trusted vendors.
                </p>
              </div>
              <Button
                size="sm"
                disabled={savingSupplier}
                onClick={() => void saveSupplier()}
              >
                {savingSupplier ? "Saving…" : "Add supplier"}
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Supplier name</Label>
                <Input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Acme Foods, Fresh Farms…"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Contact number</Label>
                <Input
                  value={supplierContact}
                  onChange={(e) => setSupplierContact(e.target.value)}
                  placeholder="03xx-xxxxxxx"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Address</Label>
                <Input
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  placeholder="Street, City"
                />
              </div>
            </div>

            {supplierFormError ? (
              <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{supplierFormError}</span>
              </div>
            ) : null}

            {suppliers.loading && !suppliers.data ? (
              <Skeleton className="h-32 w-full" />
            ) : (suppliers.data?.items ?? []).length === 0 ? (
              <EmptyState
                title="No suppliers yet"
                description="Add your first supplier using the form above."
              />
            ) : (
              <SlimTable<SupplierRow>
                rowKey={(r) => r._id}
                columns={[
                  {
                    key: "n",
                    header: "Name",
                    cell: (r) => (
                      <span className="font-medium">{r.supplier_name}</span>
                    ),
                  },
                  {
                    key: "c",
                    header: "Contact",
                    align: "right",
                    cell: (r) => (
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {r.contact_number}
                      </span>
                    ),
                  },
                ]}
                rows={suppliers.data?.items ?? []}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
