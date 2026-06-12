"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { AlertCircle, ShoppingBasket, Trash2 } from "lucide-react";

import { RequireRole } from "@/components/auth/RequireRole";
import { PageHeader } from "@/components/pages/PageHeader";
import { MenuItemPickTile } from "@/components/pos/MenuItemPickTile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiGet, apiPost } from "@/lib/api-client";
import type { OrderBillPdfInput } from "@/lib/bill-pdf";
import { canPlaceOrders } from "@/lib/rbac";
import { useApiList } from "@/lib/useApiList";
import { cn } from "@/lib/utils";
import { isValidPhone, PHONE_HINT } from "@/lib/validation";

type MenuRow = {
  _id: string;
  category_id: string;
  item_name: string;
  price: number;
  availability_status?: string;
  image_url?: string | null;
};

type CategoryRow = {
  _id: string;
  category_name: string;
  is_active?: boolean;
};

type WaiterRow = { _id: string; name: string };

function pkr(n: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function CategoryChip({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5",
        "text-[12px] font-medium tracking-[-0.005em] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.55)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
        active
          ? "border-[hsl(var(--primary)/0.45)] bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]"
          : "border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--accent))]",
      )}
    >
      <span className="truncate">{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-px text-[10.5px] tabular-nums",
          active
            ? "bg-[hsl(var(--primary)/0.18)] text-[hsl(var(--primary))]"
            : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function PlaceOrderInner() {
  const router = useRouter();
  const { toast } = useToast();
  const menu = useApiList<MenuRow>("/api/menu-items?limit=100");
  const categories = useApiList<CategoryRow>("/api/categories?limit=100");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("");
  const [cart, setCart] = React.useState<Record<string, number>>({});
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [orderType, setOrderType] = React.useState("dine-in");
  const [discount, setDiscount] = React.useState("");
  const [taxPercent, setTaxPercent] = React.useState("0");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  const [waiters, setWaiters] = React.useState<WaiterRow[]>([]);
  const [waitersLoading, setWaitersLoading] = React.useState(true);
  const [waiterId, setWaiterId] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    setWaitersLoading(true);
    apiGet<{ items: WaiterRow[] }>("/api/users/by-role?role=waiter")
      .then((res) => {
        if (cancelled) return;
        setWaiters(res.items ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setWaiters([]);
      })
      .finally(() => {
        if (!cancelled) setWaitersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function addToCart(id: string) {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  }
  function setQty(id: string, qty: number) {
    setCart((c) => {
      const next = { ...c };
      if (qty < 1) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  const categoryList = React.useMemo(
    () =>
      (categories.data?.items ?? []).filter((c) => c.is_active !== false),
    [categories.data?.items],
  );

  const filteredMenu = React.useMemo(() => {
    const items = (menu.data?.items ?? []).filter(
      (m) => m.availability_status !== "unavailable",
    );
    const q = query.trim().toLowerCase();
    return items.filter((m) => {
      if (categoryFilter && m.category_id !== categoryFilter) return false;
      if (q && !m.item_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [menu.data?.items, query, categoryFilter]);

  const lines = React.useMemo(() => {
    const items = menu.data?.items ?? [];
    const byId = new Map(items.map((m) => [m._id, m]));
    return Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([id, quantity]) => {
        const m = byId.get(id);
        return {
          menu_item_id: id,
          quantity,
          name: m?.item_name ?? "Item",
          unit: m?.price ?? 0,
          line: (m?.price ?? 0) * quantity,
        };
      });
  }, [cart, menu.data?.items]);

  const subtotal = Math.round(lines.reduce((s, l) => s + l.line, 0) * 100) / 100;
  const discountNum = Math.max(0, Number(discount) || 0);
  const taxRate = Math.min(100, Math.max(0, Number(taxPercent) || 0)) / 100;
  const afterDisc = Math.max(0, subtotal - discountNum);
  const taxAmt = Math.round(afterDisc * taxRate * 100) / 100;
  const final = Math.round((afterDisc + taxAmt) * 100) / 100;

  async function submit() {
    setError(null);
    if (!customerName.trim() || !customerPhone.trim()) {
      setError("Customer name and phone are required.");
      return;
    }
    if (!isValidPhone(customerPhone)) {
      setError(PHONE_HINT);
      return;
    }
    if (!waiterId) {
      setError("Pick the waiter who brought this order in.");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one menu item.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost<{
        ok: true;
        order_id: string;
        bill: OrderBillPdfInput;
      }>("/api/orders/checkout", {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        order_type: orderType,
        discount_amount: discountNum,
        tax_rate: taxRate,
        waiter_id: waiterId,
        items: lines.map((l) => ({
          menu_item_id: l.menu_item_id,
          quantity: l.quantity,
        })),
      });
      toast({ title: "Order placed", tone: "success" });
      router.push(`/pos/orders/${res.order_id}?placed=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Orders"
        title="New order"
        description="Pick menu items, enter customer details, and place the order."
        right={
          <Button asChild variant="outline" size="sm">
            <Link href="/pos/orders">All orders</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardContent className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[14px] font-semibold tracking-[-0.005em]">
                  Menu
                </div>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                  Tap to add to the order.
                </p>
              </div>
              <Input
                type="search"
                placeholder="Search items…"
                className="max-w-[220px]"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {categories.loading && !categories.data ? (
              <div className="flex gap-1.5 overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-20 rounded-full" />
                ))}
              </div>
            ) : categoryList.length > 0 ? (
              <ScrollArea className="-mx-0.5 max-w-full">
                <div className="flex flex-nowrap items-center gap-1.5 px-0.5 pb-1">
                  <CategoryChip
                    label="All"
                    active={categoryFilter === ""}
                    count={
                      (menu.data?.items ?? []).filter(
                        (m) => m.availability_status !== "unavailable",
                      ).length
                    }
                    onClick={() => setCategoryFilter("")}
                  />
                  {categoryList.map((c) => {
                    const count = (menu.data?.items ?? []).filter(
                      (m) =>
                        m.category_id === c._id &&
                        m.availability_status !== "unavailable",
                    ).length;
                    return (
                      <CategoryChip
                        key={c._id}
                        label={c.category_name}
                        active={categoryFilter === c._id}
                        count={count}
                        onClick={() =>
                          setCategoryFilter((prev) =>
                            prev === c._id ? "" : c._id,
                          )
                        }
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            ) : null}

            {menu.error ? (
              <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{menu.error}</span>
              </div>
            ) : null}

            {menu.loading && !menu.data ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 w-full" />
                ))}
              </div>
            ) : filteredMenu.length === 0 ? (
              <EmptyState
                icon={<ShoppingBasket className="size-4" />}
                title="No items match"
                description="Try a different search, or add items from the Menu page."
              />
            ) : (
              <ScrollArea className="max-h-[min(560px,60vh)] pr-1">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredMenu.map((m) => (
                    <MenuItemPickTile
                      key={m._id}
                      name={m.item_name}
                      priceLabel={pkr(m.price)}
                      imageUrl={m.image_url}
                      onPick={() => addToCart(m._id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <Card>
            <CardContent className="grid gap-4">
              <div>
                <div className="text-[14px] font-semibold tracking-[-0.005em]">
                  Order details
                </div>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                  Customer, type, and pricing.
                </p>
              </div>

              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="cname">Customer name</Label>
                    <Input
                      id="cname"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer name"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="cphone">Phone</Label>
                    <Input
                      id="cphone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="03xx-xxxxxxx"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="waiter">Waiter</Label>
                  <Select
                    value={waiterId}
                    onValueChange={setWaiterId}
                    disabled={waitersLoading || waiters.length === 0}
                  >
                    <SelectTrigger id="waiter">
                      <SelectValue
                        placeholder={
                          waitersLoading
                            ? "Loading waiters…"
                            : waiters.length === 0
                              ? "No active waiters in your branch"
                              : "Select waiter"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {waiters.map((w) => (
                        <SelectItem key={w._id} value={w._id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!waitersLoading && waiters.length === 0 ? (
                    <p className="text-[11.5px] text-[hsl(var(--muted-foreground))]">
                      No active waiters found. Ask the admin to add a waiter
                      user for this branch.
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="otype">Order type</Label>
                  <Select value={orderType} onValueChange={setOrderType}>
                    <SelectTrigger id="otype">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dine-in">Dine-in</SelectItem>
                      <SelectItem value="takeaway">Takeaway</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="disc">Discount (PKR)</Label>
                    <Input
                      id="disc"
                      type="number"
                      min={0}
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="taxp">Tax (%)</Label>
                    <Input
                      id="taxp"
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-semibold tracking-[-0.005em]">
                    Cart
                  </div>
                  <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                    Review items before placing the order.
                  </p>
                </div>
                <Badge variant="muted">
                  {lines.length} {lines.length === 1 ? "item" : "items"}
                </Badge>
              </div>

              {lines.length === 0 ? (
                <p className="rounded-[10px] border border-dashed border-[hsl(var(--border))] px-3 py-4 text-center text-[12.5px] text-[hsl(var(--muted-foreground))]">
                  Tap items on the left to add.
                </p>
              ) : (
                <ScrollArea className="max-h-[260px] pr-1">
                  <ul className="grid gap-2">
                    {lines.map((l) => (
                      <li
                        key={l.menu_item_id}
                        className="flex items-center justify-between gap-2 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                          {l.name}
                        </span>
                        <div className="flex shrink-0 items-center gap-2">
                          <Input
                            className="h-8 w-14 px-1.5 text-center"
                            type="number"
                            min={1}
                            value={l.quantity}
                            onChange={(e) =>
                              setQty(
                                l.menu_item_id,
                                Number(e.target.value) || 0,
                              )
                            }
                          />
                          <span className="w-20 text-right text-[12.5px] tabular-nums">
                            {pkr(l.line)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Remove"
                            onClick={() => setQty(l.menu_item_id, 0)}
                            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}

              <Separator />

              <dl className="grid gap-1.5 text-[13px]">
                <div className="flex justify-between">
                  <dt className="text-[hsl(var(--muted-foreground))]">
                    Subtotal
                  </dt>
                  <dd className="tabular-nums">{pkr(subtotal)}</dd>
                </div>
                {discountNum > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-[hsl(var(--muted-foreground))]">
                      Discount
                    </dt>
                    <dd className="tabular-nums text-[hsl(var(--destructive))]">
                      − {pkr(discountNum)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-[hsl(var(--muted-foreground))]">Tax</dt>
                  <dd className="tabular-nums">{pkr(taxAmt)}</dd>
                </div>
                <Separator className="my-1" />
                <div className="flex items-baseline justify-between">
                  <dt className="text-[13px] font-semibold">Total</dt>
                  <dd className="font-display text-[20px] tabular-nums tracking-[-0.01em] text-[hsl(var(--primary))]">
                    {pkr(final)}
                  </dd>
                </div>
              </dl>

              {error ? (
                <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <Button
                type="button"
                size="lg"
                className="w-full"
                disabled={submitting}
                onClick={() => void submit()}
              >
                {submitting ? "Placing…" : "Confirm & place order"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function PlaceOrderPage() {
  return (
    <RequireRole allow={canPlaceOrders}>
      <PlaceOrderInner />
    </RequireRole>
  );
}
