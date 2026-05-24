"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  ShoppingBasket,
  Trash2,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { PageHeader } from "@/components/pages/PageHeader";
import { MenuItemPickTile } from "@/components/pos/MenuItemPickTile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
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
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import { billFromOrderDetail, downloadOrderBillPdf } from "@/lib/bill-pdf";
import { allowedStatusTargetsForRole } from "@/lib/order-status";
import {
  canCancelOrder,
  canCloseOrder,
  canCompleteOrder,
  canOperateKitchen,
  canRecordOrderPayment,
  isAdmin,
} from "@/lib/rbac";
import { useApiList } from "@/lib/useApiList";

type OrderDetail = {
  order: {
    _id: string;
    order_number: number;
    order_type: string;
    table_number?: number | null;
    status: string;
    subtotal_amount: number;
    tax_amount: number;
    discount_amount: number;
    final_amount: number;
    created_at?: string;
    accepted_at?: string | null;
    completed_at?: string | null;
  };
  items: {
    _id: string;
    menu_item_id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
  customer: { name?: string; phone?: string; email?: string | null } | null;
  is_paid?: boolean;
  payment?: {
    _id: string;
    payment_status: string;
    payment_method: string;
    paid_at?: string | null;
    transaction_reference?: string | null;
  } | null;
  cashier?: { name: string; role: string } | null;
  waiter?: { name: string; role: string } | null;
  chef?: { name: string; role: string } | null;
};

type MenuRow = {
  _id: string;
  item_name: string;
  price: number;
  availability_status?: string;
  image_url?: string | null;
};

function pkr(n: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function isTerminal(status: string) {
  return status === "completed" || status === "cancelled";
}

function statusVariant(
  status: string,
): React.ComponentProps<typeof Badge>["variant"] {
  switch (status) {
    case "completed":
      return "success";
    case "cancelled":
      return "danger";
    case "ready":
      return "primary";
    case "preparing":
      return "warning";
    default:
      return "muted";
  }
}

export function OrderDetailClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const id = String(params.id ?? "");

  const [detail, setDetail] = React.useState<OrderDetail | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [orderType, setOrderType] = React.useState("dine-in");
  const [status, setStatus] = React.useState("pending");
  const [discount, setDiscount] = React.useState("");
  const [taxPercent, setTaxPercent] = React.useState("0");
  const [cart, setCart] = React.useState<Record<string, number>>({});

  const menu = useApiList<MenuRow>("/api/menu-items?limit=100");

  const [payMethod, setPayMethod] = React.useState<"cash" | "card" | "online">(
    "cash",
  );
  const [payRef, setPayRef] = React.useState("");
  const [paySaving, setPaySaving] = React.useState(false);
  const [payError, setPayError] = React.useState<string | null>(null);


  const reloadDetail = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiGet<OrderDetail>(`/api/orders/${id}`);
      setDetail(res);
      const o = res.order;
      setOrderType(o.order_type);
      setStatus(o.status);
      setDiscount(String(o.discount_amount ?? 0));
      const base = Math.max(0, o.subtotal_amount - o.discount_amount);
      const inferred =
        base > 0 && o.tax_amount > 0 ? (o.tax_amount / base) * 100 : 0;
      setTaxPercent(String(Math.round(inferred * 100) / 100));
      const c = res.customer;
      setCustomerName(c?.name ?? "");
      setCustomerPhone(c?.phone ?? "");
      const nextCart: Record<string, number> = {};
      for (const it of res.items) {
        nextCart[it.menu_item_id] = it.quantity;
      }
      setCart(nextCart);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load order");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void reloadDetail();
  }, [reloadDetail]);

  // Background polling — refresh detail every 4s so cashier sees the kitchen
  // marking the order ready / served without manually reloading. Only updates
  // `detail`; never touches form-state (cart, discount, etc.) so anything the
  // user is editing stays intact. Stops once the order is terminal, and
  // pauses while the tab is hidden.
  React.useEffect(() => {
    if (!id) return;
    if (detail && isTerminal(detail.order.status)) return;
    const interval = window.setInterval(async () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      try {
        const res = await apiGet<OrderDetail>(`/api/orders/${id}`, {
          silent: true,
        });
        setDetail(res);
      } catch {
        /* keep showing previous detail */
      }
    }, 4000);
    return () => window.clearInterval(interval);
  }, [id, detail]);

  function addToCart(menuId: string) {
    if (detail && isTerminal(detail.order.status)) return;
    setCart((c) => ({ ...c, [menuId]: (c[menuId] ?? 0) + 1 }));
  }
  function setQty(menuId: string, qty: number) {
    setCart((c) => {
      const next = { ...c };
      if (qty < 1) delete next[menuId];
      else next[menuId] = qty;
      return next;
    });
  }

  const lines = React.useMemo(() => {
    const items = menu.data?.items ?? [];
    const byId = new Map(items.map((m) => [m._id, m]));
    return Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([menuId, quantity]) => {
        const fromMenu = byId.get(menuId);
        const fromOrder = detail?.items.find((i) => i.menu_item_id === menuId);
        const name = fromMenu?.item_name ?? fromOrder?.item_name ?? "Item";
        const unit = fromMenu?.price ?? fromOrder?.unit_price ?? 0;
        return {
          menu_item_id: menuId,
          quantity,
          name,
          unit,
          line: unit * quantity,
        };
      });
  }, [cart, menu.data?.items, detail?.items]);

  const subtotal = Math.round(lines.reduce((s, l) => s + l.line, 0) * 100) / 100;
  const discountNum = Math.max(0, Number(discount) || 0);
  const taxRate = Math.min(100, Math.max(0, Number(taxPercent) || 0)) / 100;
  const afterDisc = Math.max(0, subtotal - discountNum);
  const taxAmt = Math.round(afterDisc * taxRate * 100) / 100;
  const final = Math.round((afterDisc + taxAmt) * 100) / 100;

  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  async function saveEdits() {
    if (!detail || isTerminal(detail.order.status)) return;
    setSaveError(null);
    if (lines.length === 0) {
      setSaveError("Keep at least one line item.");
      return;
    }
    setSaving(true);
    try {
      await apiPatch(`/api/orders/${id}`, {
        items: lines.map((l) => ({
          menu_item_id: l.menu_item_id,
          quantity: l.quantity,
        })),
        discount_amount: discountNum,
        tax_rate: taxRate,
        order_type: orderType,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
      });
      await reloadDetail();
      toast({ title: "Changes saved", tone: "success" });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveStatusOnly(next: string) {
    setSaveError(null);
    setSaving(true);
    try {
      await apiPatch(`/api/orders/${id}`, { status: next });
      await reloadDetail();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function markPaid() {
    const ok = await confirm({
      title: "Record payment",
      description: "Confirm payment received for this order.",
      confirmLabel: "Record payment",
    });
    if (!ok) return;
    setPayError(null);
    setPaySaving(true);
    try {
      await apiPost(`/api/orders/${id}/payment`, {
        payment_method: payMethod,
        transaction_reference: payRef.trim() || undefined,
      });
      await reloadDetail();
      setPayRef("");
      toast({ title: "Payment recorded", tone: "success" });
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setPaySaving(false);
    }
  }

  async function removeOrder() {
    const ok = await confirm({
      title: "Delete this order?",
      description: "This is permanent and cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await apiDelete(`/api/orders/${id}`);
      router.push("/pos/orders");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const placed = searchParams.get("placed") === "1";

  if (loading && !detail) {
    return (
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (loadError || !detail) {
    return (
      <div className="grid gap-4">
        <PageHeader
          eyebrow="Orders"
          title="Order not found"
          description="We could not load this order."
        />
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/pos/orders">
              <ArrowLeft />
              Back to orders
            </Link>
          </Button>
        </div>
        {loadError ? (
          <p className="text-[13px] text-[hsl(var(--destructive))]">{loadError}</p>
        ) : null}
      </div>
    );
  }

  const terminal = isTerminal(detail.order.status);
  const o = detail.order;
  const paid = !!detail.is_paid;
  const role = user?.role ?? "";
  const floorStaff = user ? canCloseOrder(role) : false;
  const kitchenStaff = user ? canOperateKitchen(role) : false;
  const cashierFlow =
    floorStaff && !kitchenStaff && !isAdmin(role) && role !== "manager";
  const canCancel = user ? canCancelOrder(role) : false;
  const canPay = user ? canRecordOrderPayment(role) : false;
  const canComplete = user ? canCompleteOrder(role) : false;
  const billReady =
    o.status === "served" || paid || o.status === "completed";
  const paymentStepActive = o.status === "served" && !paid;
  const statusTargets = user
    ? allowedStatusTargetsForRole(role, o.status)
    : [];

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Orders"
        title={`Order #${o.order_number}`}
        description={`${o.order_type} · ${pkr(o.final_amount)}`}
        right={
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariant(o.status)} dot>
              {o.status}
            </Badge>
            <Badge variant={paid ? "success" : "muted"} dot>
              {paid ? "Paid" : "Unpaid"}
            </Badge>
            <Button asChild variant="ghost" size="sm">
              <Link href="/pos/orders">
                <ArrowLeft />
                All orders
              </Link>
            </Button>
          </div>
        }
      />

      {placed ? (
        <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.08)] px-3.5 py-3 text-[12.5px]">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[hsl(var(--primary))]" />
          <div>
            <div className="font-semibold tracking-[-0.005em] text-[hsl(var(--foreground))]">
              Order placed
            </div>
            <p className="mt-0.5 text-[hsl(var(--muted-foreground))]">
              The kitchen has been notified. When food is ready, mark the order
              served, generate the bill, collect payment, then complete the
              ticket.
            </p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-6">
          <Card>
            <CardContent className="grid gap-3">
              <div className="text-[14px] font-semibold tracking-[-0.005em]">
                Handled by
              </div>
              <dl className="grid gap-3 text-[13px] sm:grid-cols-3">
                <div>
                  <dt className="text-eyebrow mb-1">Cashier</dt>
                  <dd>{detail.cashier?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-eyebrow mb-1">Waiter</dt>
                  <dd>{detail.waiter?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-eyebrow mb-1">Chef</dt>
                  <dd>{detail.chef?.name ?? "—"}</dd>
                </div>
              </dl>
              {o.accepted_at || o.completed_at ? (
                <p className="text-[11.5px] text-[hsl(var(--muted-foreground))]">
                  {o.accepted_at
                    ? `Accepted ${new Date(o.accepted_at).toLocaleString("en-PK")}`
                    : null}
                  {o.accepted_at && o.completed_at ? " · " : null}
                  {o.completed_at
                    ? `Completed ${new Date(o.completed_at).toLocaleString("en-PK")}`
                    : null}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[14px] font-semibold tracking-[-0.005em]">
                    Payment
                  </div>
                  <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                    {paid
                      ? "Payment recorded. You can complete the order."
                      : paymentStepActive
                        ? "Generate the bill, collect payment, then complete the order."
                        : "Payment is collected after the order is marked served."}
                  </p>
                </div>
                <Badge variant={paid ? "success" : "muted"} dot>
                  {paid ? "Paid" : "Unpaid"}
                </Badge>
              </div>

              {billReady ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() =>
                    downloadOrderBillPdf(billFromOrderDetail(detail))
                  }
                >
                  <Download />
                  Generate bill PDF
                </Button>
              ) : null}

              {paid && detail.payment ? (
                <dl className="grid gap-2 text-[13px] sm:grid-cols-3">
                  <div>
                    <dt className="text-eyebrow mb-1">Method</dt>
                    <dd className="capitalize">{detail.payment.payment_method}</dd>
                  </div>
                  {detail.payment.paid_at ? (
                    <div>
                      <dt className="text-eyebrow mb-1">Paid at</dt>
                      <dd>
                        {new Date(detail.payment.paid_at).toLocaleString("en-PK")}
                      </dd>
                    </div>
                  ) : null}
                  {detail.payment.transaction_reference ? (
                    <div>
                      <dt className="text-eyebrow mb-1">Reference</dt>
                      <dd>{detail.payment.transaction_reference}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}

              {paymentStepActive && canPay ? (
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <div className="grid gap-1.5">
                    <Label htmlFor="pay-method">Payment method</Label>
                    <Select
                      value={payMethod}
                      onValueChange={(v) =>
                        setPayMethod(v as "cash" | "card" | "online")
                      }
                    >
                      <SelectTrigger id="pay-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="pay-ref">Txn reference (optional)</Label>
                    <Input
                      id="pay-ref"
                      value={payRef}
                      onChange={(e) => setPayRef(e.target.value)}
                      placeholder="Receipt / ref #"
                    />
                  </div>
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={paySaving}
                    onClick={() => void markPaid()}
                  >
                    {paySaving ? "Saving…" : "Mark as paid"}
                  </Button>
                </div>
              ) : null}

              {paymentStepActive && !canPay ? (
                <p className="text-[12.5px] text-[hsl(var(--muted-foreground))]">
                  Only cashier, manager, or admin can record payment.
                </p>
              ) : null}

              {!billReady && !paid ? (
                <p className="rounded-[10px] border border-dashed border-[hsl(var(--border))] px-3 py-3 text-[12.5px] text-[hsl(var(--muted-foreground))]">
                  Mark the order as served when the customer receives their
                  food. Billing and payment unlock at that step.
                </p>
              ) : null}

              {payError ? (
                <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  <span>{payError}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[14px] font-semibold tracking-[-0.005em]">
                    Order lifecycle
                  </div>
                  <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                    Pending → preparing → ready → served → payment → completed
                  </p>
                </div>
                <Badge variant={statusVariant(o.status)} dot className="capitalize">
                  {o.status}
                </Badge>
              </div>

              {kitchenStaff && !floorStaff ? (
                <p className="text-[12.5px] text-[hsl(var(--muted-foreground))]">
                  Accept tickets and mark them ready from the kitchen display.
                </p>
              ) : null}

              {cashierFlow && !terminal ? (
                <div className="flex flex-wrap gap-2">
                  {o.status === "pending" || o.status === "preparing" ? (
                    <p className="text-[12.5px] text-[hsl(var(--muted-foreground))]">
                      {o.status === "pending"
                        ? "Waiting for the kitchen to accept this ticket."
                        : "The kitchen is preparing this order."}
                    </p>
                  ) : null}
                  {o.status === "ready" ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={() => void saveStatusOnly("served")}
                    >
                      Mark as served
                    </Button>
                  ) : null}
                  {o.status === "served" && paid && canComplete ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={() => void saveStatusOnly("completed")}
                    >
                      Complete order
                    </Button>
                  ) : null}
                  {o.status === "served" && !paid ? (
                    <p className="text-[12.5px] text-[hsl(var(--muted-foreground))]">
                      {canPay
                        ? "Record payment above, then complete the order."
                        : "Ask the cashier to collect payment and close the ticket."}
                    </p>
                  ) : null}
                  {o.status === "served" && paid && !canComplete ? (
                    <p className="text-[12.5px] text-[hsl(var(--muted-foreground))]">
                      Payment recorded. The cashier will complete this order.
                    </p>
                  ) : null}
                  {canCancel ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                      disabled={saving}
                      onClick={() => void saveStatusOnly("cancelled")}
                    >
                      Cancel order
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {!cashierFlow &&
              !terminal &&
              statusTargets.length > 0 &&
              (isAdmin(role) || role === "manager") ? (
                <>
                  <Select
                    value={status}
                    disabled={saving}
                    onValueChange={(v) => {
                      setStatus(v);
                      void saveStatusOnly(v);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]" size="sm">
                      <SelectValue placeholder="Change status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusTargets.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {o.status === "served" && !paid ? (
                    <p className="text-[12.5px] text-[hsl(var(--muted-foreground))]">
                      Payment is required before completing this order.
                    </p>
                  ) : null}
                </>
              ) : null}

              {terminal ? (
                <p className="text-[12.5px] text-[hsl(var(--muted-foreground))]">
                  This order is closed.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {!terminal ? (
            <Card>
              <CardContent className="grid gap-5">
                <div>
                  <div className="text-[14px] font-semibold tracking-[-0.005em]">
                    Add menu items
                  </div>
                  <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                    Tap any tile to add it to this order.
                  </p>
                </div>

                {menu.loading && !menu.data ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-40 w-full" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="max-h-[min(400px,45vh)] pr-1">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(menu.data?.items ?? [])
                        .filter((m) => m.availability_status !== "unavailable")
                        .map((m) => (
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
          ) : (
            <Card>
              <CardContent>
                <p className="text-[13px] text-[hsl(var(--muted-foreground))]">
                  This order is closed. Line items cannot be changed.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardContent className="grid gap-4">
              <div>
                <div className="text-[14px] font-semibold tracking-[-0.005em]">
                  Edit order
                </div>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                  Customer, type and pricing.
                </p>
              </div>

              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="edit-cname">Customer name</Label>
                    <Input
                      id="edit-cname"
                      value={customerName}
                      disabled={terminal}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="edit-cphone">Phone</Label>
                    <Input
                      id="edit-cphone"
                      value={customerPhone}
                      disabled={terminal}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="edit-otype">Order type</Label>
                  <Select
                    value={orderType}
                    disabled={terminal}
                    onValueChange={setOrderType}
                  >
                    <SelectTrigger id="edit-otype">
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
                    <Label htmlFor="edit-disc">Discount (PKR)</Label>
                    <Input
                      id="edit-disc"
                      type="number"
                      min={0}
                      value={discount}
                      disabled={terminal}
                      onChange={(e) => setDiscount(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="edit-tax">Tax (%)</Label>
                    <Input
                      id="edit-tax"
                      type="number"
                      min={0}
                      value={taxPercent}
                      disabled={terminal}
                      onChange={(e) => setTaxPercent(e.target.value)}
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
                    Line items
                  </div>
                  <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                    Review items and totals before saving.
                  </p>
                </div>
                <Badge variant="muted">
                  {lines.length} {lines.length === 1 ? "item" : "items"}
                </Badge>
              </div>

              {lines.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-[hsl(var(--border))] px-3 py-4 text-center text-[12.5px] text-[hsl(var(--muted-foreground))]">
                  <ShoppingBasket className="mx-auto mb-1 size-4" />
                  No items
                </div>
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
                            disabled={terminal}
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
                            disabled={terminal}
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
                  <dt className="text-[13px] font-semibold">Total (preview)</dt>
                  <dd className="font-display text-[20px] tabular-nums tracking-[-0.01em] text-[hsl(var(--primary))]">
                    {pkr(final)}
                  </dd>
                </div>
              </dl>

              {saveError ? (
                <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  <span>{saveError}</span>
                </div>
              ) : null}

              {!terminal ? (
                <div className="grid gap-2">
                  <Button
                    type="button"
                    className="w-full"
                    disabled={saving}
                    onClick={() => void saveEdits()}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                  {isAdmin(role) ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                      onClick={() => void removeOrder()}
                    >
                      Delete order
                    </Button>
                  ) : null}
                </div>
              ) : isAdmin(role) ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                  onClick={() => void removeOrder()}
                >
                  Delete order
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
