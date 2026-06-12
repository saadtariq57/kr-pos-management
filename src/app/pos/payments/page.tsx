"use client";

import Link from "next/link";
import { ArrowUpRight, CreditCard } from "lucide-react";

import { PageHeader } from "@/components/pages/PageHeader";
import { SlimTable } from "@/components/pages/SlimTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiList } from "@/lib/useApiList";

type PaymentRow = {
  _id: string;
  order_id: string;
  payment_method: string;
  payment_status: string;
  paid_at?: string | null;
  transaction_reference?: string | null;
  order: {
    order_number: number | null;
    order_type: string | null;
    final_amount: number | null;
    status: string | null;
    created_at: string | null;
  } | null;
  customer: { name: string | null; phone: string | null } | null;
};

function statusVariant(
  s: string,
): React.ComponentProps<typeof Badge>["variant"] {
  if (s === "paid" || s === "succeeded" || s === "completed") return "success";
  if (s === "failed" || s === "refunded") return "danger";
  if (s === "pending") return "warning";
  return "muted";
}

function methodLabel(m: string) {
  if (m === "cash") return "Cash";
  if (m === "card") return "Card";
  if (m === "online") return "Online";
  return m;
}

function pkr(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDateTime(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function PaymentsPage() {
  const payments = useApiList<PaymentRow>("/api/payments?limit=50");

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Payments"
        title="Payments"
        description="A ledger of how and when orders were settled. Click any row to open the order."
      />
      <Card>
        <CardContent>
          {payments.loading && !payments.data ? (
            <Skeleton className="h-40 w-full" />
          ) : (payments.data?.items ?? []).length === 0 ? (
            <EmptyState
              icon={<CreditCard className="size-4" />}
              title="No payments yet"
              description="Payments recorded against orders will appear here."
            />
          ) : (
            <SlimTable<PaymentRow>
              rowKey={(r) => r._id}
              columns={[
                {
                  key: "order",
                  header: "Order",
                  cell: (r) => (
                    <div className="grid gap-0.5 leading-tight">
                      <span className="font-display text-[14px] tabular-nums tracking-[-0.01em]">
                        #{r.order?.order_number ?? "—"}
                      </span>
                      <span className="text-[11.5px] capitalize text-[hsl(var(--muted-foreground))]">
                        {r.order?.order_type ?? "—"}
                      </span>
                    </div>
                  ),
                },
                {
                  key: "customer",
                  header: "Customer",
                  cell: (r) => (
                    <div className="grid gap-0.5 leading-tight">
                      <span className="text-[13px] font-medium">
                        {r.customer?.name ?? "—"}
                      </span>
                      {r.customer?.phone ? (
                        <span className="text-[11.5px] tabular-nums text-[hsl(var(--muted-foreground))]">
                          {r.customer.phone}
                        </span>
                      ) : null}
                    </div>
                  ),
                },
                {
                  key: "method",
                  header: "Method",
                  cell: (r) => (
                    <Badge variant="outline">{methodLabel(r.payment_method)}</Badge>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (r) => (
                    <Badge variant={statusVariant(r.payment_status)} dot>
                      {r.payment_status}
                    </Badge>
                  ),
                },
                {
                  key: "amount",
                  header: "Amount",
                  align: "right",
                  cell: (r) => (
                    <span className="font-medium tabular-nums">
                      {pkr(r.order?.final_amount)}
                    </span>
                  ),
                },
                {
                  key: "paid_at",
                  header: "Paid at",
                  cell: (r) => (
                    <span className="text-[12.5px] tabular-nums text-[hsl(var(--muted-foreground))]">
                      {fmtDateTime(r.paid_at)}
                    </span>
                  ),
                },
                {
                  key: "ref",
                  header: "Reference",
                  cell: (r) => (
                    <span className="font-mono text-[12px] text-[hsl(var(--muted-foreground))]">
                      {r.transaction_reference ?? "—"}
                    </span>
                  ),
                },
                {
                  key: "open",
                  header: "",
                  align: "right",
                  cell: (r) =>
                    r.order_id ? (
                      <Link
                        href={`/pos/orders/${r.order_id}`}
                        className="inline-flex items-center gap-1 rounded-[8px] border border-[hsl(var(--border))] px-2 py-1 text-[12px] font-medium text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--accent))]"
                      >
                        Open
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                    ) : (
                      <span className="text-[12px] text-[hsl(var(--muted-foreground))]">
                        —
                      </span>
                    ),
                },
              ]}
              rows={payments.data?.items ?? []}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
