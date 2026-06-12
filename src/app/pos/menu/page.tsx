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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const up = await fetch("/api/upload", {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  const upJson = await up.json();
  if (!up.ok) throw new Error(upJson?.error ?? "Image upload failed");
  return upJson.url as string;
}

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
  const [itemAvailability, setItemAvailability] = React.useState("available");
  const [itemFormError, setItemFormError] = React.useState<string | null>(null);
  const itemImageInputRef = React.useRef<HTMLInputElement | null>(null);

  const [editingCategory, setEditingCategory] =
    React.useState<CategoryRow | null>(null);
  const [editingItem, setEditingItem] = React.useState<MenuItemRow | null>(null);

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
    setItemName("");
    setItemPrice("");
    setItemDesc("");
    setItemCategory("");
    setItemImageFile(null);
    setItemAvailability("available");
    setItemFormError(null);
    if (itemImageInputRef.current) itemImageInputRef.current.value = "";
  }

  async function createMenuItem() {
    if (!itemName.trim() || !itemCategory || !itemPrice) return;
    setItemFormError(null);
    setCreatingItem(true);
    try {
      const newImageUrl = itemImageFile ? await uploadImage(itemImageFile) : null;
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
                    align: isAdmin ? "left" : "right",
                    cell: (r) =>
                      (r.is_active ?? true) ? (
                        <Badge variant="success" size="sm">Yes</Badge>
                      ) : (
                        <Badge variant="muted" size="sm">No</Badge>
                      ),
                  },
                  ...(isAdmin
                    ? [
                        {
                          key: "actions",
                          header: "",
                          align: "right" as const,
                          cell: (r: CategoryRow) => (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingCategory(r)}
                            >
                              Edit
                            </Button>
                          ),
                        },
                      ]
                    : []),
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
                      Add new items here, or edit existing ones from the list.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => void createMenuItem()}
                    disabled={creatingItem}
                  >
                    {creatingItem ? "Saving…" : "Add item"}
                  </Button>
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
                          onClick={() => setEditingItem(r)}
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

      <EditCategoryDialog
        category={editingCategory}
        onOpenChange={(open) => {
          if (!open) setEditingCategory(null);
        }}
        onSaved={async () => {
          setEditingCategory(null);
          await categories.reload();
        }}
      />

      <EditMenuItemDialog
        item={editingItem}
        categories={categoryItems}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
        onSaved={async () => {
          setEditingItem(null);
          await items.reload();
        }}
      />
    </div>
  );
}

function EditCategoryDialog({
  category,
  onOpenChange,
  onSaved,
}: {
  category: CategoryRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [active, setActive] = React.useState("true");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (category) {
      setName(category.category_name);
      setDescription(category.description ?? "");
      setActive((category.is_active ?? true) ? "true" : "false");
      setError(null);
    }
  }, [category]);

  async function save() {
    if (!category) return;
    setError(null);
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    setSaving(true);
    try {
      await apiPatch(`/api/categories/${category._id}`, {
        category_name: name.trim(),
        description: description.trim(),
        is_active: active === "true",
      });
      toast({ title: "Category updated", tone: "success" });
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update category.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!category} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit category</DialogTitle>
          <DialogDescription>
            Update the category name, description, or visibility.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-cat-name">Category name</Label>
            <Input
              id="edit-cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Burgers, Drinks…"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-cat-desc">Description</Label>
            <Input
              id="edit-cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-cat-active">Active</Label>
            <Select value={active} onValueChange={setActive}>
              <SelectTrigger id="edit-cat-active">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm" disabled={saving}>
              Cancel
            </Button>
          </DialogClose>
          <Button size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditMenuItemDialog({
  item,
  categories,
  onOpenChange,
  onSaved,
}: {
  item: MenuItemRow | null;
  categories: CategoryRow[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [availability, setAvailability] = React.useState("available");
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (item) {
      setName(item.item_name);
      setPrice(String(item.price));
      setDescription(item.description ?? "");
      setCategoryId(item.category_id);
      setAvailability(item.availability_status ?? "available");
      setImageFile(null);
      setError(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }, [item]);

  async function save() {
    if (!item) return;
    setError(null);
    if (!name.trim() || !categoryId || !price) {
      setError("Item name, price, and category are required.");
      return;
    }
    setSaving(true);
    try {
      const newImageUrl = imageFile ? await uploadImage(imageFile) : null;
      const patch: Record<string, unknown> = {
        category_id: categoryId,
        item_name: name.trim(),
        description: description.trim(),
        price: Number(price),
        cost_price: Number(price),
        availability_status: availability,
      };
      if (newImageUrl) patch.image_url = newImageUrl;
      await apiPatch(`/api/menu-items/${item._id}`, patch);
      toast({ title: "Item updated", tone: "success" });
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update menu item.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(100vw-2rem,560px)]">
        <DialogHeader>
          <DialogTitle>Edit menu item</DialogTitle>
          <DialogDescription>
            Update pricing, category, availability, or the product image.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-item-name">Item name</Label>
            <Input
              id="edit-item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Zinger Burger"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-item-price">Price</Label>
            <Input
              id="edit-item-price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="500"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-item-category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="edit-item-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.category_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-item-availability">Availability</Label>
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger id="edit-item-availability">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="edit-item-desc">Description</Label>
            <Input
              id="edit-item-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="edit-item-image">
              Product image{" "}
              <span className="text-[hsl(var(--muted-foreground))]">
                (leave empty to keep current)
              </span>
            </Label>
            <Input
              ref={imageInputRef}
              id="edit-item-image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        {error ? (
          <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm" disabled={saving}>
              Cancel
            </Button>
          </DialogClose>
          <Button size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
