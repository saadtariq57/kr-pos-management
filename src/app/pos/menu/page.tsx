"use client";

import Image from "next/image";
import * as React from "react";
import { AlertCircle, ShoppingBasket } from "lucide-react";

import { PageHeader } from "@/components/pages/PageHeader";
import { SlimTable } from "@/components/pages/SlimTable";
import { Badge } from "@/components/ui/badge";
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
import { useApiList } from "@/lib/useApiList";
import { useAuth } from "@/components/auth/AuthProvider";

type CategoryRow = {
  _id: string;
  category_name: string;
  description?: string;
  is_active?: boolean;
};

type MenuItemRow = {
  _id: string;
  category_id: string;
  item_name: string;
  description?: string;
  price: number;
  availability_status?: string;
  image_url?: string | null;
};

export default function MenuPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const categories = useApiList<CategoryRow>("/api/categories?limit=50");
  const items = useApiList<MenuItemRow>("/api/menu-items?limit=50");
  const { toast } = useToast();
  const confirm = useConfirm();

  const [catName, setCatName] = React.useState("");
  const [catDesc, setCatDesc] = React.useState("");
  const [creatingCat, setCreatingCat] = React.useState(false);

  const [itemName, setItemName] = React.useState("");
  const [itemPrice, setItemPrice] = React.useState("");
  const [itemDesc, setItemDesc] = React.useState("");
  const [itemCategory, setItemCategory] = React.useState("");
  const [itemImageFile, setItemImageFile] = React.useState<File | null>(null);
  const [creatingItem, setCreatingItem] = React.useState(false);
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [itemAvailability, setItemAvailability] = React.useState("available");
  const [itemFormError, setItemFormError] = React.useState<string | null>(null);
  const itemImageInputRef = React.useRef<HTMLInputElement | null>(null);

  async function createCategory() {
    if (!catName.trim()) return;
    setCreatingCat(true);
    try {
      await apiPost("/api/categories", {
        category_name: catName.trim(),
        description: catDesc.trim(),
      });
      setCatName("");
      setCatDesc("");
      await categories.reload();
      toast({ title: "Category added", tone: "success" });
    } catch (e) {
      toast({
        title: "Could not add category",
        description: e instanceof Error ? e.message : undefined,
        tone: "danger",
      });
    } finally {
      setCreatingCat(false);
    }
  }

  function resetItemForm() {
    setEditingItemId(null);
    setItemName("");
    setItemPrice("");
    setItemDesc("");
    setItemCategory("");
    setItemImageFile(null);
    setItemAvailability("available");
    setItemFormError(null);
    if (itemImageInputRef.current) itemImageInputRef.current.value = "";
  }

  function startEditItem(row: MenuItemRow) {
    setItemFormError(null);
    setEditingItemId(row._id);
    setItemName(row.item_name);
    setItemPrice(String(row.price));
    setItemDesc(row.description ?? "");
    setItemCategory(row.category_id);
    setItemImageFile(null);
    setItemAvailability(row.availability_status ?? "available");
    if (itemImageInputRef.current) itemImageInputRef.current.value = "";
  }

  async function uploadItemImage(): Promise<string | null> {
    if (!itemImageFile) return null;
    const fd = new FormData();
    fd.append("file", itemImageFile);
    const up = await fetch("/api/upload", {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    const upJson = await up.json();
    if (!up.ok) throw new Error(upJson?.error ?? "Image upload failed");
    return upJson.url as string;
  }

  async function saveMenuItem() {
    if (!itemName.trim() || !itemCategory || !itemPrice) return;
    setItemFormError(null);
    setCreatingItem(true);
    try {
      const newImageUrl = await uploadItemImage();
      if (editingItemId) {
        const patch: Record<string, unknown> = {
          category_id: itemCategory,
          item_name: itemName.trim(),
          description: itemDesc.trim(),
          price: Number(itemPrice),
          cost_price: Number(itemPrice),
          availability_status: itemAvailability,
        };
        if (newImageUrl) patch.image_url = newImageUrl;
        await apiPatch(`/api/menu-items/${editingItemId}`, patch);
        toast({ title: "Item updated", tone: "success" });
      } else {
        await apiPost("/api/menu-items", {
          category_id: itemCategory,
          item_name: itemName.trim(),
          description: itemDesc.trim(),
          price: Number(itemPrice),
          cost_price: Number(itemPrice),
          availability_status: itemAvailability,
          image_url: newImageUrl,
        });
        toast({ title: "Item added", tone: "success" });
      }
      resetItemForm();
      await items.reload();
    } catch (e) {
      setItemFormError(
        e instanceof Error ? e.message : "Could not save menu item.",
      );
    } finally {
      setCreatingItem(false);
    }
  }

  async function deleteMenuItem(id: string, name: string) {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      description: "This menu item will be removed.",
      destructive: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setItemFormError(null);
    try {
      await apiDelete(`/api/menu-items/${id}`);
      if (editingItemId === id) resetItemForm();
      await items.reload();
      toast({ title: "Item deleted" });
    } catch (e) {
      setItemFormError(
        e instanceof Error ? e.message : "Could not delete menu item.",
      );
    }
  }

  const categoryItems = categories.data?.items ?? [];

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Menu"
        title="Menu &amp; categories"
        description="Curate the menu — group items into categories, set prices, and toggle availability."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="grid gap-5">
            {isAdmin ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-semibold tracking-[-0.005em]">
                      Categories
                    </div>
                    <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                      Group menu items for easier ordering.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => void createCategory()} disabled={creatingCat}>
                    {creatingCat ? "Adding…" : "Add category"}
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="cat-name">Category name</Label>
                    <Input
                      id="cat-name"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="Burgers, Drinks…"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="cat-desc">Description</Label>
                    <Input
                      id="cat-desc"
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div className="text-[14px] font-semibold tracking-[-0.005em]">
                  Categories
                </div>
                <p className="text-[12.5px] text-[hsl(var(--muted-foreground))] mt-1">
                  List of active menu categories. Adding new categories is restricted to Admins.
                </p>
              </div>
            )}

            {categories.error ? (
              <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{categories.error}</span>
              </div>
            ) : null}

            {categories.loading && !categories.data ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <SlimTable<CategoryRow>
                rowKey={(r) => r._id}
                columns={[
                  {
                    key: "name",
                    header: "Name",
                    cell: (r) => (
                      <span className="font-medium">{r.category_name}</span>
                    ),
                  },
                  {
                    key: "desc",
                    header: "Description",
                    cell: (r) => (
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {r.description || "—"}
                      </span>
                    ),
                  },
                  {
                    key: "active",
                    header: "Active",
                    align: "right",
                    cell: (r) =>
                      (r.is_active ?? true) ? (
                        <Badge variant="success" size="sm">Yes</Badge>
                      ) : (
                        <Badge variant="muted" size="sm">No</Badge>
                      ),
                  },
                ]}
                rows={categoryItems}
                empty={
                  <EmptyState
                    title="No categories yet"
                    description="Create a category to start grouping items."
                  />
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-5">
            {isAdmin ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-semibold tracking-[-0.005em]">
                      Menu items
                    </div>
                    <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                      Add, edit, or remove items.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editingItemId ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={resetItemForm}
                        disabled={creatingItem}
                      >
                        Cancel edit
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      onClick={() => void saveMenuItem()}
                      disabled={creatingItem}
                    >
                      {creatingItem
                        ? "Saving…"
                        : editingItemId
                          ? "Save changes"
                          : "Add item"}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="item-name">Item name</Label>
                    <Input
                      id="item-name"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="Zinger Burger"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="item-price">Price</Label>
                    <Input
                      id="item-price"
                      type="number"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      placeholder="500"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="item-category">Category</Label>
                    <Select value={itemCategory} onValueChange={setItemCategory}>
                      <SelectTrigger id="item-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryItems.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.category_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="item-image">Product image</Label>
                    <Input
                      ref={itemImageInputRef}
                      id="item-image"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => setItemImageFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label htmlFor="item-desc">Description</Label>
                    <Input
                      id="item-desc"
                      value={itemDesc}
                      onChange={(e) => setItemDesc(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="item-availability">Availability</Label>
                    <Select
                      value={itemAvailability}
                      onValueChange={setItemAvailability}
                    >
                      <SelectTrigger id="item-availability">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div className="text-[14px] font-semibold tracking-[-0.005em]">
                  Menu items
                </div>
                <p className="text-[12.5px] text-[hsl(var(--muted-foreground))] mt-1">
                  Catalog of active menu items. Adding new items or curating pricing is restricted to Admins.
                </p>
              </div>
            )}

            {itemFormError ? (
              <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{itemFormError}</span>
              </div>
            ) : null}

            {items.error ? (
              <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{items.error}</span>
              </div>
            ) : null}

            {items.loading && !items.data ? (
              <Skeleton className="h-40 w-full" />
            ) : (items.data?.items ?? []).length === 0 ? (
              <EmptyState
                icon={<ShoppingBasket className="size-4" />}
                title="No menu items yet"
                description="Add your first item using the form above."
              />
            ) : (
              (() => {
                const tableColumns = [
                  {
                    key: "item",
                    header: "Item",
                    cell: (r: MenuItemRow) => (
                      <div className="flex items-center gap-2.5">
                        {r.image_url ? (
                          <Image
                            src={r.image_url}
                            alt={r.item_name}
                            width={28}
                            height={28}
                            className="size-7 rounded-[6px] object-cover"
                          />
                        ) : (
                          <div className="size-7 rounded-[6px] bg-[hsl(var(--muted))]" />
                        )}
                        <span className="font-medium">{r.item_name}</span>
                      </div>
                    ),
                  },
                  {
                    key: "price",
                    header: "Price",
                    align: "right" as const,
                    cell: (r: MenuItemRow) => (
                      <span className="tabular-nums">{r.price}</span>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    cell: (r: MenuItemRow) =>
                      r.availability_status === "unavailable" ? (
                        <Badge variant="muted" size="sm">Unavailable</Badge>
                      ) : (
                        <Badge variant="success" size="sm" dot>Available</Badge>
                      ),
                  },
                  {
                    key: "cat",
                    header: "Category",
                    cell: (r: MenuItemRow) => (
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {categoryItems.find((c) => c._id === r.category_id)
                          ?.category_name ?? "—"}
                      </span>
                    ),
                  },
                ];

                if (isAdmin) {
                  tableColumns.push({
                    key: "actions",
                    header: "",
                    align: "right" as const,
                    cell: (r: MenuItemRow) => (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditItem(r)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                          onClick={() => void deleteMenuItem(r._id, r.item_name)}
                        >
                          Delete
                        </Button>
                      </div>
                    ),
                  });
                }

                return (
                  <SlimTable<MenuItemRow>
                    rowKey={(r) => r._id}
                    columns={tableColumns}
                    rows={items.data?.items ?? []}
                  />
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
