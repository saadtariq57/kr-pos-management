"use client";

import * as React from "react";
import { Wallet } from "lucide-react";

import { PageHeader } from "@/components/pages/PageHeader";
import { SlimTable } from "@/components/pages/SlimTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { apiPost } from "@/lib/api-client";
import { useApiList } from "@/lib/useApiList";

type ExpenseRow = {
  _id: string;
  expense_type: string;
  amount: number;
  expense_date: string;
};

const EXPENSE_TYPES = [
  "rent",
  "utilities",
  "salaries",
  "supplies",
  "marketing",
  "maintenance",
  "other",
];

function pkr(n: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ExpensesPage() {
  const expenses = useApiList<ExpenseRow>("/api/expenses?limit=30");
  const { toast } = useToast();
  const [type, setType] = React.useState("rent");
  const [amount, setAmount] = React.useState("0");
  const [submitting, setSubmitting] = React.useState(false);

  async function addExpense() {
    if (!Number(amount)) return;
    setSubmitting(true);
    try {
      await apiPost("/api/expenses", {
        expense_type: type,
        amount: Number(amount),
        expense_date: new Date().toISOString(),
        description: "",
      });
      setAmount("0");
      await expenses.reload();
      toast({ title: "Expense recorded", tone: "success" });
    } catch (e) {
      toast({
        title: "Could not record expense",
        description: e instanceof Error ? e.message : undefined,
        tone: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Expenses"
        title="Expense management"
        description="Record day-to-day expenses and watch how the numbers add up."
        right={
          <Button
            size="sm"
            onClick={() => void addExpense()}
            disabled={submitting}
          >
            {submitting ? "Adding…" : "Add expense"}
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Amount (PKR)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {expenses.loading && !expenses.data ? (
            <Skeleton className="h-40 w-full" />
          ) : (expenses.data?.items ?? []).length === 0 ? (
            <EmptyState
              icon={<Wallet className="size-4" />}
              title="No expenses yet"
              description="Record your first expense using the form above."
            />
          ) : (
            <SlimTable<ExpenseRow>
              rowKey={(r) => r._id}
              columns={[
                {
                  key: "t",
                  header: "Type",
                  cell: (r) => (
                    <Badge variant="muted" size="sm" className="capitalize">
                      {r.expense_type}
                    </Badge>
                  ),
                },
                {
                  key: "a",
                  header: "Amount",
                  align: "right",
                  cell: (r) => (
                    <span className="font-medium tabular-nums">
                      {pkr(r.amount)}
                    </span>
                  ),
                },
                {
                  key: "d",
                  header: "Date",
                  align: "right",
                  cell: (r) => (
                    <span className="text-[hsl(var(--muted-foreground))]">
                      {new Date(r.expense_date).toLocaleDateString("en-PK", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  ),
                },
              ]}
              rows={expenses.data?.items ?? []}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
