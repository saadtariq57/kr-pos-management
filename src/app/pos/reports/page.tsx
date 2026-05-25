"use client";

import * as React from "react";
import {
  Bookmark,
  Boxes,
  ChartNoAxesColumn,
  ClipboardList,
  ScrollText,
  Users,
  TrendingUp,
  Wallet,
  TrendingDown,
  Activity,
  ShoppingBag,
  Building2,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

import { PageHeader } from "@/components/pages/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/components/auth/AuthProvider";
import { useApiList } from "@/lib/useApiList";

type BranchRow = {
  _id: string;
  name: string;
  city: string;
};

function pkr(n: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--ring))",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#3b82f6",
];

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-2.5 shadow-md backdrop-blur-md">
        <p className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] mb-1">{label}</p>
        <div className="flex flex-col gap-1">
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 text-xs font-semibold">
              <span className="size-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
              <span className="text-[hsl(var(--muted-foreground))]">{p.name || p.dataKey}:</span>
              <span className="text-foreground tabular-nums">
                {formatter ? formatter(p.value, p) : p.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Filter States
  const [range, setRange] = React.useState<string>("30d");
  const [activeBranchId, setActiveBranchId] = React.useState<string>("all");

  // Fetch lists
  const branches = useApiList<BranchRow>("/api/branches");

  // Construct dynamic report path
  const queryParams = new URLSearchParams();
  queryParams.append("range", range);
  if (activeBranchId && activeBranchId !== "all") {
    queryParams.append("branch_id", activeBranchId);
  }

  const reports = useApiList<any>(`/api/reports?${queryParams.toString()}`);

  // Top level hooks to fully satisfy the Rules of Hooks
  const menuItems = useApiList<any>("/api/menu-items?limit=1");

  const totalRevenue = reports.data?.totalRevenue ?? 0;
  const totalExpenses = reports.data?.totalExpenses ?? 0;
  const netProfit = reports.data?.netProfit ?? 0;
  const avgOrderValue = reports.data?.avgOrderValue ?? 0;
  const orderCount = reports.data?.orderCount ?? 0;
  const totalTax = reports.data?.totalTax ?? 0;
  const totalDiscount = reports.data?.totalDiscount ?? 0;
  const totalSubtotal = reports.data?.totalSubtotal ?? 0;
  const totalUnitsSold = reports.data?.totalUnitsSold ?? 0;
  const expenseCount = reports.data?.expenseCount ?? 0;
  const timeseries = reports.data?.timeseries ?? [];
  const categoryBreakdown = reports.data?.categoryBreakdown ?? [];
  const topSellingItems = reports.data?.topSellingItems ?? [];

  // Determine scoped branch display details
  const currentBranchDetails = React.useMemo(() => {
    if (isAdmin) {
      if (activeBranchId === "all") return { name: "All Branches", city: "Company-wide" };
      return (branches.data?.items ?? []).find((b) => b._id === activeBranchId) || null;
    }
    return user?.branch || null;
  }, [branches.data, activeBranchId, isAdmin, user]);

  // Max item quantity for progress percentage bar calculations
  const maxItemQuantity = React.useMemo(() => {
    if (topSellingItems.length === 0) return 1;
    return Math.max(...topSellingItems.map((item: any) => item.quantity));
  }, [topSellingItems]);

  return (
    <div className="grid gap-8">
      {/* Page Header */}
      <PageHeader
        eyebrow="Analytics"
        title="Reports & Insights"
        description="Monitor real-time sales summaries, profit/loss tracking, category distributions, and top performers."
        right={
          <div className="flex items-center gap-3">
            {/* Range Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Range
              </span>
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="w-[160px] h-9 bg-card shadow-sm border-[hsl(var(--border))]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Past 7 Days</SelectItem>
                  <SelectItem value="30d">Past 30 Days</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      {/* Admin Branch Scoped Tabs */}
      {isAdmin && branches.data?.items && branches.data.items.length > 0 && (
        <div className="border-b border-[hsl(var(--border))] pb-2 bg-card/25 rounded-xl p-3 shadow-sm border">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[hsl(var(--muted-foreground))] block mb-2 px-1">
            Filter Ledger By Branch
          </span>
          <Tabs value={activeBranchId} onValueChange={setActiveBranchId} className="w-full">
            <TabsList className="flex flex-wrap h-auto w-fit p-1 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-[10px]">
              <TabsTrigger value="all" className="h-7 text-xs px-3">
                All Branches
              </TabsTrigger>
              {branches.data.items.map((b) => (
                <TabsTrigger key={b._id} value={b._id} className="h-7 text-xs px-3">
                  {b.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Top Summary Metrics Row (4 Cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Net Revenue */}
        <Card className="relative overflow-hidden bg-card/60 backdrop-blur-md shadow-sm border-[hsl(var(--border))] border-t-4 border-t-primary">
          <div className="absolute right-3 top-3 p-2 bg-primary/10 text-primary rounded-lg">
            <TrendingUp className="size-5" />
          </div>
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Net Sales Revenue
            </span>
          </CardHeader>
          <CardContent>
            {reports.loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {pkr(totalRevenue)}
              </div>
            )}
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] truncate">
              {currentBranchDetails?.name}
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Total Expenses */}
        <Card className="relative overflow-hidden bg-card/60 backdrop-blur-md shadow-sm border-[hsl(var(--border))] border-t-4 border-t-amber-500">
          <div className="absolute right-3 top-3 p-2 bg-amber-500/10 text-amber-500 rounded-lg">
            <Wallet className="size-5" />
          </div>
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Branch Expenses
            </span>
          </CardHeader>
          <CardContent>
            {reports.loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {pkr(totalExpenses)}
              </div>
            )}
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] truncate">
              Operational costs
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Net Profit / Loss */}
        <Card className={`relative overflow-hidden bg-card/60 backdrop-blur-md shadow-sm border-[hsl(var(--border))] border-t-4 ${netProfit >= 0 ? "border-t-emerald-500" : "border-t-rose-500"}`}>
          <div className={`absolute right-3 top-3 p-2 rounded-lg ${netProfit >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
            {netProfit >= 0 ? <Activity className="size-5" /> : <TrendingDown className="size-5" />}
          </div>
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Net Profit / Loss
            </span>
          </CardHeader>
          <CardContent>
            {reports.loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className={`text-2xl font-bold tracking-tight tabular-nums ${netProfit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {pkr(netProfit)}
              </div>
            )}
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] truncate">
              Revenue minus expenses
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Completed Orders / Avg spent */}
        <Card className="relative overflow-hidden bg-card/60 backdrop-blur-md shadow-sm border-[hsl(var(--border))] border-t-4 border-t-indigo-500">
          <div className="absolute right-3 top-3 p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
            <ShoppingBag className="size-5" />
          </div>
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Orders Ledger
            </span>
          </CardHeader>
          <CardContent>
            {reports.loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {orderCount} <span className="text-xs text-[hsl(var(--muted-foreground))] font-normal">({pkr(avgOrderValue)} avg)</span>
              </div>
            )}
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] truncate">
              Completed transactions count
            </p>
          </CardContent>
        </Card>
      </div>

      {reports.loading && !reports.data ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-[hsl(var(--border))] shadow-sm p-6"><Skeleton className="h-80 w-full" /></Card>
          <Card className="border-[hsl(var(--border))] shadow-sm p-6"><Skeleton className="h-80 w-full" /></Card>
        </div>
      ) : timeseries.length === 0 ? (
        <EmptyState
          icon={<ChartNoAxesColumn className="size-6 text-[hsl(var(--muted-foreground))]" />}
          title="No analytics logs available"
          description="Reports require completed and paid order transactions to generate insight maps."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Chart 1: Revenue vs. Expenses Timeseries (Area Chart) */}
          <Card className="border-[hsl(var(--border))] shadow-sm">
            <CardHeader className="pb-4 border-b border-[hsl(var(--border))] bg-card/15">
              <CardTitle className="text-base font-semibold text-foreground">Revenue vs. Expenses</CardTitle>
              <CardDescription className="text-xs mt-1">Daily cash flow matching your scope and filters</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      content={
                        <CustomTooltip
                          formatter={(val: number) => pkr(val)}
                        />
                      }
                      cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "4 4" }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                    <Area type="monotone" name="Sales Revenue" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                    <Area type="monotone" name="Expenses" dataKey="expenses" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Chart 2: Category Breakdown Sales Split (Bar Chart) */}
          <Card className="border-[hsl(var(--border))] shadow-sm">
            <CardHeader className="pb-4 border-b border-[hsl(var(--border))] bg-card/15">
              <CardTitle className="text-base font-semibold text-foreground">Sales by Menu Category</CardTitle>
              <CardDescription className="text-xs mt-1">Unit sales distribution grouped strictly by category</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-72 w-full">
                {categoryBreakdown.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-[hsl(var(--muted-foreground))]">
                    No sales splits logged in this period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        content={
                          <CustomTooltip
                            formatter={(val: number) => `${val.toLocaleString()} units sold`}
                          />
                        }
                        cursor={false}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={45}>
                        {categoryBreakdown.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Performers and Details panels */}
      {!reports.loading && timeseries.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Top Selling Items (Left Panel) */}
          <Card className="lg:col-span-1 border-[hsl(var(--border))] shadow-sm">
            <CardHeader className="pb-3 border-b border-[hsl(var(--border))] bg-card/15">
              <CardTitle className="text-base font-semibold text-foreground">Top Performing Items</CardTitle>
              <CardDescription className="text-xs mt-1">Best-selling menu items by units sold</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-4">
              {topSellingItems.length === 0 ? (
                <div className="text-xs text-[hsl(var(--muted-foreground))] text-center py-6">
                  No menu item records logged.
                </div>
              ) : (
                topSellingItems.map((item: any, i: number) => {
                  const widthPercent = (item.quantity / maxItemQuantity) * 100;
                  return (
                    <div key={item.name} className="grid gap-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                        <span className="truncate">
                          {i + 1}. {item.name}
                        </span>
                        <span className="tabular-nums font-bold">{item.quantity} units sold</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))]">
                        <span>Total Revenue: {pkr(item.revenue)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${widthPercent}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Quick Stats Summary Panel (Right/Middle Panel) */}
          <Card className="lg:col-span-2 border-[hsl(var(--border))] shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-[hsl(var(--border))] bg-card/15">
              <CardTitle className="text-base font-semibold text-foreground">Analytics Highlights</CardTitle>
              <CardDescription className="text-xs mt-1">Lightweight counts of supporting POS modules</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 md:grid-cols-3 border-b border-[hsl(var(--border))]">
                <div className="p-4 flex flex-col gap-1 border-r border-b border-[hsl(var(--border))] md:border-b-0">
                  <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">
                    Subtotal Revenue
                  </span>
                  <span className="text-xl font-bold text-foreground tabular-nums">
                    {pkr(totalSubtotal)}
                  </span>
                </div>
                <div className="p-4 flex flex-col gap-1 border-r border-b border-[hsl(var(--border))] md:border-b-0">
                  <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">
                    Tax Collected
                  </span>
                  <span className="text-xl font-bold text-foreground tabular-nums">
                    {pkr(totalTax)}
                  </span>
                </div>
                <div className="p-4 flex flex-col gap-1 border-r border-b border-[hsl(var(--border))] md:border-b-0">
                  <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">
                    Discounts Offered
                  </span>
                  <span className="text-xl font-bold text-foreground tabular-nums">
                    {pkr(totalDiscount)}
                  </span>
                </div>
                <div className="p-4 flex flex-col gap-1 border-r border-[hsl(var(--border))]">
                  <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">
                    Total Units Sold
                  </span>
                  <span className="text-xl font-bold text-foreground tabular-nums">
                    {totalUnitsSold.toLocaleString()}
                  </span>
                </div>
                <div className="p-4 flex flex-col gap-1 border-r border-[hsl(var(--border))]">
                  <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">
                    Expense Records
                  </span>
                  <span className="text-xl font-bold text-foreground tabular-nums">
                    {expenseCount.toLocaleString()}
                  </span>
                </div>
                <div className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">
                    Active Menu Items
                  </span>
                  <span className="text-xl font-bold text-foreground tabular-nums">
                    {(menuItems.data?.total ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-card/45 flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))] font-semibold">
                <div className="flex items-center gap-1">
                  <Calendar className="size-4 text-indigo-500" />
                  <span>Reporting Period:</span>
                  <span className="text-foreground font-bold uppercase tracking-wider bg-[hsl(var(--secondary))] px-2 py-0.5 border rounded-[6px]">
                    {range === "7d" ? "Past 7 days" : range === "this_month" ? "This current Month" : "Past 30 days"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Building2 className="size-4 text-indigo-500" />
                  <span>Branch target:</span>
                  <span className="text-foreground font-bold capitalize">{currentBranchDetails?.name}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
