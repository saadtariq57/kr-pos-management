"use client";

import * as React from "react";
import {
  CheckCircle2,
  ChefHat,
  CookingPot,
  Loader2,
  Timer,
  Utensils,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { PageHeader } from "@/components/pages/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useApiList } from "@/lib/useApiList";
import { canOperateKitchen } from "@/lib/rbac";

type OrderRow = {
  _id: string;
  order_number: number;
  status: string;
  order_type: string;
  created_at?: string;
  accepted_by_chef_id?: string | null;
  chef_name?: string | null;
  waiter_name?: string | null;
  cashier_name?: string | null;
  items?: { item_name: string; quantity: number }[];
};

async function patchOrder(id: string, status: string) {
  const res = await fetch(`/api/orders/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    let msg = "Failed to update order";
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* keep default */
    }
    throw new Error(msg);
  }
}

function statusVariant(
  status: string,
): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "ready") return "primary";
  if (status === "preparing") return "warning";
  return "muted";
}

/**
 * Kitchen display.
 *
 * Polls the orders list every 4 seconds so new tickets show up without a
 * page refresh. Chefs see:
 *   - **Accept** on pending tickets — first chef to click claims the ticket
 *     (status flips to preparing and `accepted_by_chef_id` is stamped).
 *   - **Mark ready** on tickets they accepted — only the same chef (or an
 *     admin) can mark ready, enforced server-side.
 *   - Already-claimed tickets stay visible but are read-only with the chef's
 *     name shown so the team knows who's on it.
 */
export default function KitchenPage() {
  const { user } = useAuth();
  const orders = useApiList<OrderRow>("/api/orders?limit=40");
  const { toast } = useToast();

  // Pull `reload` out so the interval below only restarts when the function
  // identity actually changes (it's memoised on the API path), not on every
  // render where `orders.data` flips.
  const { reload } = orders;
  React.useEffect(() => {
    const id = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      void reload({ silent: true });
    }, 4000);
    return () => window.clearInterval(id);
  }, [reload]);

  const canOperate = user && canOperateKitchen(user.role);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const active = (orders.data?.items ?? []).filter((o) =>
    ["pending", "preparing", "ready"].includes(o.status),
  );

  async function setStatus(id: string, status: string, n: number) {
    setPendingId(id);
    try {
      await patchOrder(id, status);
      await orders.reload();
      toast({ title: `Order #${n} → ${status}`, tone: "success" });
    } catch (e) {
      toast({
        title: "Could not update",
        description: e instanceof Error ? e.message : undefined,
        tone: "danger",
      });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Kitchen"
        title="Kitchen display"
        description="Accept tickets, then mark them ready when the food leaves the pass."
        right={
          <Badge variant="muted" dot>
            Live
          </Badge>
        }
      />

      {!canOperate ? (
        <Card>
          <CardContent>
            <p className="text-[13px] text-[hsl(var(--muted-foreground))]">
              You can view the kitchen, but only chefs (or admins) can accept
              and complete tickets.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {orders.loading && !orders.data ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<CookingPot className="size-4" />}
              title="All clear"
              description="No active tickets right now. New orders will appear here automatically."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {active.map((o) => {
            const claimed = !!o.accepted_by_chef_id;
            const mine =
              claimed && user ? o.accepted_by_chef_id === user.id : false;

            return (
              <Card key={o._id} className="overflow-hidden">
                <CardContent className="grid gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-eyebrow">Ticket</div>
                      <div className="mt-1 font-display text-[22px] tracking-[-0.015em]">
                        #{o.order_number}
                      </div>
                    </div>
                    <Badge variant={statusVariant(o.status)} dot>
                      {o.status}
                    </Badge>
                  </div>

                  <div className="grid gap-1.5 text-[12.5px] text-[hsl(var(--muted-foreground))]">
                    <div className="flex items-center gap-2">
                      <Timer className="size-3.5" />
                      <span className="capitalize">{o.order_type}</span>
                    </div>
                    {o.waiter_name ? (
                      <div className="flex items-center gap-2">
                        <span className="text-eyebrow">Waiter</span>
                        <span className="text-[hsl(var(--foreground))]">
                          {o.waiter_name}
                        </span>
                      </div>
                    ) : null}
                    {claimed ? (
                      <div className="flex items-center gap-2">
                        <ChefHat className="size-3.5" />
                        <span>
                          {mine
                            ? "Accepted by you"
                            : `Accepted by ${o.chef_name ?? "another chef"}`}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-1.5 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-2">
                    <div className="flex items-center gap-1.5 text-eyebrow">
                      <Utensils className="size-3" />
                      <span>
                        Items
                        {o.items && o.items.length > 0
                          ? ` · ${o.items.reduce((s, it) => s + it.quantity, 0)}`
                          : ""}
                      </span>
                    </div>
                    {o.items && o.items.length > 0 ? (
                      <ul className="grid gap-1 text-[13px]">
                        {o.items.map((it, i) => (
                          <li
                            key={`${o._id}-item-${i}`}
                            className="flex items-baseline justify-between gap-3"
                          >
                            <span className="min-w-0 flex-1 truncate font-medium text-[hsl(var(--foreground))]">
                              {it.item_name}
                            </span>
                            <span className="shrink-0 text-[12.5px] tabular-nums text-[hsl(var(--muted-foreground))]">
                              × {it.quantity}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                        No items recorded.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {o.status === "pending" ? (
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={!canOperate || pendingId === o._id}
                        onClick={() =>
                          void setStatus(o._id, "preparing", o.order_number)
                        }
                      >
                        {pendingId === o._id ? (
                          <Loader2 className="animate-spin" />
                        ) : null}
                        Accept ticket
                      </Button>
                    ) : null}

                    {o.status === "preparing" ? (
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={
                          !canOperate || (claimed && !mine) || pendingId === o._id
                        }
                        onClick={() =>
                          void setStatus(o._id, "ready", o.order_number)
                        }
                      >
                        {pendingId === o._id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <CheckCircle2 />
                        )}
                        Mark ready
                      </Button>
                    ) : null}

                    {o.status === "ready" ? (
                      <Badge variant="primary" className="flex-1 justify-center">
                        Awaiting pickup
                      </Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
