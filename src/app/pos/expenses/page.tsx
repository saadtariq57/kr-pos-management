"use client";

import * as React from "react";
import { Wallet, Calendar, Building2, TrendingUp, FileText, PlusCircle, LayoutGrid } from "lucide-react";

import { PageHeader } from "@/components/pages/PageHeader";
import { SlimTable } from "@/components/pages/SlimTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuth } from "@/components/auth/AuthProvider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiPost } from "@/lib/api-client";
import { useApiList } from "@/lib/useApiList";

type ExpenseRow = {
  _id: string;
  expense_type: string;
  amount: number;
  description: string;
  expense_date: string;
  branch_id?: {
    _id: string;
    name: string;
    city: string;
  } | string | null;
};

type BranchRow = {
  _id: string;
  name: string;
  city: string;
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

// Generate the current month and the past 11 months dynamically
const getRecentMonths = () => {
  const list = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    list.push({ label, value });
  }
  return list;
};

// Custom badge colors per expense type for vibrant modern styling
function getExpenseBadgeStyle(type: string) {
  const t = type.toLowerCase();
  if (t === "rent") {
    return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900";
  }
  if (t === "utilities" || t === "utility") {
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
  }
  if (t === "salaries" || t === "salary") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
  }
  if (t === "supplies") {
    return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900";
  }
  if (t === "marketing") {
    return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900";
  }
  if (t === "maintenance") {
    return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900";
  }
  return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800";
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const isAdmin = user?.role === "admin";
  const recentMonths = React.useMemo(() => getRecentMonths(), []);

  // Filter States
  const [month, setMonth] = React.useState<string>(() => recentMonths[0].value);
  const [activeBranchId, setActiveBranchId] = React.useState<string>("");

  // Form States
  const [type, setType] = React.useState("rent");
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [addBranch, setAddBranch] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);

  // Dynamic Query Path: fetch all expenses for the month for client-side branch separation and clean stats
  const queryParams = new URLSearchParams();
  queryParams.append("limit", "150"); // higher limit to capture all ledger items for accurate monthly metrics
  if (month && month !== "all") {
    queryParams.append("month", month);
  }

  const expenses = useApiList<ExpenseRow>(`/api/expenses?${queryParams.toString()}`);
  const branches = useApiList<BranchRow>("/api/branches");

  // Automatically default active branch tab and add branch selection once branches load for Admin
  React.useEffect(() => {
    if (isAdmin && branches.data?.items && branches.data.items.length > 0) {
      if (!activeBranchId) {
        setActiveBranchId(branches.data.items[0]._id);
      }
      if (!addBranch) {
        setAddBranch(branches.data.items[0]._id);
      }
    }
  }, [branches.data, isAdmin, activeBranchId, addBranch]);

  // Determine currently scoped branch ID
  const currentBranchId = isAdmin ? activeBranchId : (user?.branch?.id ?? "");

  // Resolve the current active branch object details for cards/form
  const currentBranchDetails = React.useMemo(() => {
    if (isAdmin) {
      return (branches.data?.items ?? []).find((b) => b._id === activeBranchId) || null;
    }
    return user?.branch || null;
  }, [branches.data, activeBranchId, isAdmin, user]);

  // Sync form branch with current active tab branch automatically for intuitive UX
  React.useEffect(() => {
    if (isAdmin && activeBranchId) {
      setAddBranch(activeBranchId);
    }
  }, [activeBranchId, isAdmin]);

  // 1. Overall Spent (All Branches for the Month)
  const overallSpent = React.useMemo(() => {
    return (expenses.data?.items ?? []).reduce((acc, curr) => acc + curr.amount, 0);
  }, [expenses.data]);

  // 2. Spent in Current Selected Branch (Current Branch Tab only)
  const branchSpent = React.useMemo(() => {
    const items = expenses.data?.items ?? [];
    if (!currentBranchId) return 0;
    return items
      .filter((item) => {
        const bId = item.branch_id && typeof item.branch_id === "object" ? item.branch_id._id : item.branch_id;
        return String(bId) === String(currentBranchId);
      })
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [expenses.data, currentBranchId]);

  // 3. Top Category for Selected Branch Tab
  const branchTopCategory = React.useMemo(() => {
    const items = expenses.data?.items ?? [];
    const filtered = items.filter((item) => {
      const bId = item.branch_id && typeof item.branch_id === "object" ? item.branch_id._id : item.branch_id;
      return !currentBranchId || String(bId) === String(currentBranchId);
    });

    if (filtered.length === 0) return { type: "N/A", amount: 0 };
    const groups: Record<string, number> = {};
    filtered.forEach((item) => {
      groups[item.expense_type] = (groups[item.expense_type] || 0) + item.amount;
    });

    let maxType = "N/A";
    let maxAmount = 0;
    Object.entries(groups).forEach(([t, amt]) => {
      if (amt > maxAmount) {
        maxAmount = amt;
        maxType = t;
      }
    });
    return { type: maxType, amount: maxAmount };
  }, [expenses.data, currentBranchId]);

  // Slice displayed list strictly based on selected branch tab
  const displayedExpenses = React.useMemo(() => {
    const items = expenses.data?.items ?? [];
    if (!currentBranchId) return items;
    return items.filter((item) => {
      const bId = item.branch_id && typeof item.branch_id === "object" ? item.branch_id._id : item.branch_id;
      return String(bId) === String(currentBranchId);
    });
  }, [expenses.data, currentBranchId]);

  async function addExpense() {
    const amtNum = Number(amount);
    if (!amtNum || amtNum <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter an amount greater than 0.",
        tone: "danger",
      });
      return;
    }

    if (isAdmin && !addBranch) {
      toast({
        title: "Branch required",
        description: "Please select a branch to record this expense.",
        tone: "danger",
      });
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/api/expenses", {
        expense_type: type,
        amount: amtNum,
        expense_date: new Date().toISOString(),
        description: description.trim(),
        branch_id: isAdmin ? addBranch : undefined,
      });

      setAmount("");
      setDescription("");
      await expenses.reload();
      toast({ title: "Expense recorded successfully", tone: "success" });
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
      {/* Page Header */}
      <PageHeader
        eyebrow="Expenses"
        title="Expense management"
        description="Record day-to-day expenses, filter by month, and monitor branch expenditures."
        right={
          <div className="flex items-center gap-3">
            {/* Month Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Month
              </span>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-[180px] h-9 bg-card shadow-sm border-[hsl(var(--border))]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  {recentMonths.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      {/* Visual Analytics / 4 Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Spent (All Branches Overall) */}
        <Card className="relative overflow-hidden bg-card/60 backdrop-blur-md shadow-sm border-[hsl(var(--border))]">
          <div className="absolute right-3 top-3 p-2 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <LayoutGrid className="size-5" />
          </div>
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              {isAdmin ? "Total Spent (All Branches)" : "Total Spent"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {pkr(overallSpent)}
            </div>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Total monthly expenditures
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Total Spent in Selected Branch */}
        <Card className="relative overflow-hidden bg-card/60 backdrop-blur-md shadow-sm border-[hsl(var(--border))] border-l-4 border-l-indigo-500">
          <div className="absolute right-3 top-3 p-2 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Wallet className="size-5" />
          </div>
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Spent in Branch
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {pkr(branchSpent)}
            </div>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] truncate">
              {currentBranchDetails?.name || "Selected Branch"}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Top Category for Selected Branch */}
        <Card className="relative overflow-hidden bg-card/60 backdrop-blur-md shadow-sm border-[hsl(var(--border))]">
          <div className="absolute right-3 top-3 p-2 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <TrendingUp className="size-5" />
          </div>
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Top Category (Branch)
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground capitalize truncate">
              {branchTopCategory.type}
            </div>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
              {branchTopCategory.amount > 0 ? `${pkr(branchTopCategory.amount)} spent` : "No records yet"}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Active Branch Info */}
        <Card className="relative overflow-hidden bg-card/60 backdrop-blur-md shadow-sm border-[hsl(var(--border))]">
          <div className="absolute right-3 top-3 p-2 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-lg">
            <Building2 className="size-5" />
          </div>
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Active Branch Tab
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground truncate">
              {currentBranchDetails?.name || "Global Office"}
            </div>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] truncate">
              {currentBranchDetails?.city ? `${currentBranchDetails.city} office` : "System-wide"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3 items-start">
        {/* Record Expense Form */}
        <Card className="lg:col-span-1 border-[hsl(var(--border))] shadow-sm">
          <CardHeader className="pb-3 border-b border-[hsl(var(--border))]">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <PlusCircle className="size-5 text-indigo-500" />
              Record Expense
            </CardTitle>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              Add a new operational expense to track.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 mt-4">
            {/* Admin-only Branch Selector */}
            {isAdmin && (
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Select Branch</Label>
                <Select value={addBranch} onValueChange={setAddBranch}>
                  <SelectTrigger className="w-full bg-card">
                    <SelectValue placeholder="Choose branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {(branches.data?.items ?? []).map((b) => (
                      <SelectItem key={b._id} value={b._id}>
                        {b.name} ({b.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Manager-only Branch Display Context */}
            {!isAdmin && (
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-lg flex items-center gap-2.5">
                <Building2 className="size-4 text-indigo-500" />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-500">
                    Recording for Branch
                  </div>
                  <div className="text-xs font-semibold text-foreground truncate">
                    {user?.branch?.name || "Global Office"}
                  </div>
                </div>
              </div>
            )}

            {/* Expense Type */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Expense Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full bg-card">
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

            {/* Amount */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Amount (PKR)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="bg-card text-foreground"
              />
            </div>

            {/* Description */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Paid electricity bill"
                className="bg-card text-foreground"
              />
            </div>

            <Button
              className="w-full mt-2"
              onClick={() => void addExpense()}
              disabled={submitting}
            >
              {submitting ? "Adding…" : "Add expense"}
            </Button>
          </CardContent>
        </Card>

        {/* Expenses List Table */}
        <Card className="lg:col-span-2 border-[hsl(var(--border))] shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-[hsl(var(--border))] bg-card/40">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <FileText className="size-5 text-indigo-500" />
              Expense Directory
            </CardTitle>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              Historical ledger of recorded items.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {/* Dynamic Branch Tabs for Admin to view separated lists strictly by branch */}
            {isAdmin && branches.data?.items && branches.data.items.length > 0 && (
              <div className="px-4 pt-4 border-b border-[hsl(var(--border))] bg-card/25">
                <Tabs value={activeBranchId} onValueChange={setActiveBranchId} className="w-full">
                  <TabsList className="flex flex-wrap h-auto w-fit p-1 mb-2 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-[10px]">
                    {branches.data.items.map((b) => (
                      <TabsTrigger key={b._id} value={b._id} className="h-7 text-xs px-3">
                        {b.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}

            {expenses.loading && !expenses.data ? (
              <div className="p-6">
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            ) : displayedExpenses.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Wallet className="size-6 text-[hsl(var(--muted-foreground))]" />}
                  title="No expenses found"
                  description="Record your first expense or clear filters to view ledger."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <SlimTable<ExpenseRow>
                  rowKey={(r) => r._id}
                  columns={[
                    {
                      key: "t",
                      header: "Type",
                      cell: (r) => (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${getExpenseBadgeStyle(r.expense_type)}`}>
                          {r.expense_type}
                        </span>
                      ),
                    },
                    {
                      key: "d",
                      header: "Description",
                      cell: (r) => (
                        <div className="max-w-[240px] truncate text-xs text-foreground font-medium" title={r.description || "N/A"}>
                          {r.description || <span className="text-[hsl(var(--muted-foreground))]">No note</span>}
                        </div>
                      ),
                    },
                    {
                      key: "a",
                      header: "Amount",
                      align: "right",
                      cell: (r) => (
                        <span className="font-bold text-foreground tabular-nums text-xs">
                          {pkr(r.amount)}
                        </span>
                      ),
                    },
                    {
                      key: "dt",
                      header: "Date",
                      align: "right",
                      cell: (r) => (
                        <span className="text-xs text-[hsl(var(--muted-foreground))] font-medium">
                          {new Date(r.expense_date).toLocaleDateString("en-PK", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      ),
                    },
                  ]}
                  rows={displayedExpenses}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
