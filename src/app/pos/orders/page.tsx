"use client";

import Link from "next/link";
import * as React from "react";
import { AlertCircle, ClipboardList, Plus } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { PageHeader } from "@/components/pages/PageHeader";
import { SlimTable } from "@/components/pages/SlimTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty-state";
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
import {
  canCompleteOrder,
  canPlaceOrders,
  canRecordOrderPayment,
  isAdmin,
} from "@/lib/rbac";
import { useApiList } from "@/lib/useApiList";

type OrderRow = {
  _id: string;
  order_number: number;
  order_type: string;
  status: string;
  final_amount: number;
  created_at?: string;
  is_paid?: boolean;
  cashier_name?: string | null;
  waiter_name?: string | null;
  chef_name?: string | null;
};

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "served", label: "Served" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

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
    case "served":
      return "outline";
    default:
      return "muted";
  }
}

export default function OrdersPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [status, setStatus] = React.useState("all");
  const { data, error, loading, reload } = useApiList<OrderRow>(
    `/api/orders?limit=50${status !== "all" ? `&status=${encodeURIComponent(status)}` : ""}`,
  );

  const canNew = user && canPlaceOrders(user.role);
  const canPay = user && canRecordOrderPayment(user.role);
  const canComplete = user && canCompleteOrder(user.role);
  const canDelete = !!user && isAdmin(user.role);

  async function markPaidQuick(id: string, n: number) {
    const ok = await confirm({
      title: `Mark order #${n} as paid?`,
      description:
        "This records a cash payment. The order must already be marked served.",
      confirmLabel: "Mark paid",
    });
    if (!ok) return;
    try {
      await apiPost(`/api/orders/${id}/payment`, { payment_method: "cash" });
      await reload();
      toast({ title: "Marked as paid", tone: "success" });
    } catch (e) {
      toast({
        title: "Could not mark paid",
        description: e instanceof Error ? e.message : undefined,
        tone: "danger",
      });
    }
  }

  async function completeOrder(id: string, n: number) {
    const ok = await confirm({
      title: `Complete order #${n}?`,
      description: "The order will close and can no longer be edited.",
      confirmLabel: "Complete",
    });
    if (!ok) return;
    try {
      await apiPatch(`/api/orders/${id}`, { status: "completed" });
      await reload();
      toast({ title: `Order #${n} completed`, tone: "success" });
    } catch (e) {
      toast({
        title: "Could not update order",
        description: e instanceof Error ? e.message : undefined,
        tone: "danger",
      });
    }
  }

  async function deleteOrder(id: string, n: number) {
    const ok = await confirm({
      title: `Delete order #${n}?`,
      description: "This is permanent and cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await apiDelete(`/api/orders/${id}`);
      await reload();
      toast({ title: `Order #${n} deleted`, tone: "default" });
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : undefined,
        tone: "danger",
      });
    }
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Orders"
        title="Order management"
        description="Track tickets through the kitchen, then collect payment after serving and close orders."
        right={
          canNew ? (
            <Button asChild size="sm">
              <Link href="/pos/place-order">
                <Plus />
                New order
              </Link>
            </Button>
          ) : null
        }
      />

      <Card>
        <CardContent className="grid gap-5">
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="status-filter">Filter by status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {!canNew ? (
            <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
              Only cashiers and admins can create orders from{" "}
              <Link
                href="/pos/place-order"
                className="font-medium underline underline-offset-4"
              >
                New order
              </Link>
              . Managers can still complete orders here.
            </p>
          ) : null}

          {loading && !data ? (
            <div className="grid gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (data?.items ?? []).length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="size-4" />}
              title="No orders yet"
              description="When you place an order from New order, it will appear here."
              action={
                canNew ? (
                  <Button asChild size="sm">
                    <Link href="/pos/place-order">Place an order</Link>
                  </Button>
                ) : null
              }
            />
          ) : (
            <SlimTable<OrderRow>
              rowKey={(r) => r._id}
              columns={[
                {
                  key: "no",
                  header: "Order",
                  cell: (r) => (
                    <span className="font-semibold tracking-[-0.005em]">
                      #{r.order_number}
                    </span>
                  ),
                },
                {
                  key: "type",
                  header: "Type",
                  cell: (r) => (
                    <span className="capitalize text-[hsl(var(--muted-foreground))]">
                      {r.order_type}
                    </span>
                  ),
                },
                {
                  key: "people",
                  header: "Handled by",
                  cell: (r) => (
                    <div className="grid gap-0.5 text-[12px] leading-tight">
                      {r.waiter_name ? (
                        <span>
                          <span className="text-[hsl(var(--muted-foreground))]">
                            Waiter:{" "}
                          </span>
                          {r.waiter_name}
                        </span>
                      ) : null}
                      {r.chef_name ? (
                        <span>
                          <span className="text-[hsl(var(--muted-foreground))]">
                            Chef:{" "}
                          </span>
                          {r.chef_name}
                        </span>
                      ) : null}
                      {!r.waiter_name && !r.chef_name ? (
                        <span className="text-[hsl(var(--muted-foreground))]">
                          —
                        </span>
                      ) : null}
                    </div>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (r) => (
                    <Badge variant={statusVariant(r.status)} dot>
                      {r.status}
                    </Badge>
                  ),
                },
                {
                  key: "paid",
                  header: "Payment",
                  cell: (r) =>
                    r.is_paid ? (
                      <Badge variant="success" dot>
                        Paid
                      </Badge>
                    ) : (
                      <Badge variant="muted">Unpaid</Badge>
                    ),
                },
                {
                  key: "amount",
                  header: "Total",
                  align: "right",
                  cell: (r) => (
                    <span className="font-medium tabular-nums">
                      {pkr(r.final_amount)}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "",
                  align: "right",
                  cell: (r) => (
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/pos/orders/${r._id}`}>Open</Link>
                      </Button>
                      {canPay && !r.is_paid && r.status === "served" ? (
                        <Button
                          type="button"
                          variant="soft"
                          size="sm"
                          onClick={() => void markPaidQuick(r._id, r.order_number)}
                        >
                          Mark paid
                        </Button>
                      ) : null}
                      {canComplete ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            isTerminal(r.status) ||
                            r.status !== "served" ||
                            !r.is_paid
                          }
                          onClick={() =>
                            void completeOrder(r._id, r.order_number)
                          }
                        >
                          Complete
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.10)]"
                          onClick={() =>
                            void deleteOrder(r._id, r.order_number)
                          }
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  ),
                },
              ]}
              rows={data?.items ?? []}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
