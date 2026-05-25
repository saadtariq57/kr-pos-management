import Link from "next/link";
import mongoose from "mongoose";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  ChevronRight,
  ClipboardList,
  CookingPot,
  CreditCard,
  IdCard,
  Plus,
  ShieldCheck,
  ShoppingBasket,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/pages/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSessionUserApproved } from "@/lib/auth-server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models";
import { roleHasNavAccess, type NavKey } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const SHORTCUT_METADATA = [
  {
    key: "place-order" as NavKey,
    title: "New order",
    hint: "Dine-in or takeaway counter register",
    href: "/pos/place-order",
    icon: ShoppingCart,
    color: "border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]",
    hoverColor: "group-hover:bg-[hsl(var(--success)/0.15)] group-hover:border-[hsl(var(--success)/0.4)]",
  },
  {
    key: "orders" as NavKey,
    title: "Orders tracker",
    hint: "Live status, receipts and kitchen handoff",
    href: "/pos/orders",
    icon: ClipboardList,
    color: "border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]",
    hoverColor: "group-hover:bg-[hsl(var(--primary)/0.15)] group-hover:border-[hsl(var(--primary)/0.35)]",
  },
  {
    key: "kitchen" as NavKey,
    title: "Kitchen display",
    hint: "Chef workspace and active queue",
    href: "/pos/kitchen",
    icon: CookingPot,
    color: "border-[hsl(38_92%_55%/0.32)] bg-[hsl(38_92%_55%/0.1)] text-[hsl(38_92%_62%)]",
    hoverColor: "group-hover:bg-[hsl(38_92%_55%/0.15)] group-hover:border-[hsl(38_92%_55%/0.42)]",
  },
  {
    key: "menu" as NavKey,
    title: "Menu management",
    hint: "Items, descriptions, pricing and tags",
    href: "/pos/menu",
    icon: ShoppingBasket,
    color: "border-amber-500/20 bg-amber-500/10 text-amber-500",
    hoverColor: "group-hover:bg-amber-500/15 group-hover:border-amber-500/30",
  },
  {
    key: "inventory" as NavKey,
    title: "Inventory & stock",
    hint: "Raw ingredients, suppliers and reorder levels",
    href: "/pos/inventory",
    icon: Boxes,
    color: "border-blue-500/20 bg-blue-500/10 text-blue-500",
    hoverColor: "group-hover:bg-blue-500/15 group-hover:border-blue-500/30",
  },
  {
    key: "expenses" as NavKey,
    title: "Expense logs",
    hint: "Record operations overheads and supplier purchases",
    href: "/pos/expenses",
    icon: Wallet,
    color: "border-[hsl(var(--destructive)/0.32)] bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]",
    hoverColor: "group-hover:bg-[hsl(var(--destructive)/0.15)] group-hover:border-[hsl(var(--destructive)/0.42)]",
  },
  {
    key: "payments" as NavKey,
    title: "Payments ledger",
    hint: "Payment methods, checkout references and status",
    href: "/pos/payments",
    icon: CreditCard,
    color: "border-violet-500/20 bg-violet-500/10 text-violet-500",
    hoverColor: "group-hover:bg-violet-500/15 group-hover:border-violet-500/30",
  },
  {
    key: "customers" as NavKey,
    title: "Customer profiles",
    hint: "Loyalty points, contact logs and reservations",
    href: "/pos/customers",
    icon: Users,
    color: "border-teal-500/20 bg-teal-500/10 text-teal-500",
    hoverColor: "group-hover:bg-teal-500/15 group-hover:border-teal-500/30",
  },
  {
    key: "employees" as NavKey,
    title: "Employees directory",
    hint: "HR files, basic salaries and shift designations",
    href: "/pos/employees",
    icon: IdCard,
    color: "border-sky-500/20 bg-sky-500/10 text-sky-500",
    hoverColor: "group-hover:bg-sky-500/15 group-hover:border-sky-500/30",
  },
  {
    key: "users" as NavKey,
    title: "Staff credentials",
    hint: "Auth profiles, email verification and system roles",
    href: "/pos/users",
    icon: ShieldCheck,
    color: "border-cyan-500/20 bg-cyan-500/10 text-cyan-500",
    hoverColor: "group-hover:bg-cyan-500/15 group-hover:border-cyan-500/30",
  },
  {
    key: "branches" as NavKey,
    title: "Branches index",
    hint: "Configure restaurant locations, phones and status",
    href: "/pos/branches",
    icon: Building2,
    color: "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-500",
    hoverColor: "group-hover:bg-fuchsia-500/15 group-hover:border-fuchsia-500/30",
  },
  {
    key: "reports" as NavKey,
    title: "Reports & analytics",
    hint: "Sales summaries, net profit and dynamic timeseries",
    href: "/pos/reports",
    icon: BarChart3,
    color: "border-purple-500/20 bg-purple-500/10 text-purple-500",
    hoverColor: "group-hover:bg-purple-500/15 group-hover:border-purple-500/30",
  },
];

export default async function PosHome() {
  const session = await getSessionUserApproved();
  if (!session) {
    return null;
  }

  const role = session.role;
  const showMetrics = role === "admin" || role === "manager";

  let metrics = null;

  if (showMetrics) {
    await connectDB();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const branchFilter: Record<string, any> = {};
    if (role === "manager" && session.branch?.id) {
      branchFilter.branch_id = new mongoose.Types.ObjectId(session.branch.id);
    }

    // 1 & 2: Revenue and Orders Count for today
    const todayOrders = await Order.find({
      ...branchFilter,
      created_at: { $gte: startOfToday },
      status: { $ne: "cancelled" }
    }).lean<any[]>();

    const todayRevenue = todayOrders
      .filter((o) => ["completed", "served"].includes(o.status))
      .reduce((sum, o) => sum + (o.final_amount || 0), 0);

    const todayOrdersCount = todayOrders.length;

    // 3: Open Tables: active orders with a table_number
    const openTablesCount = await Order.countDocuments({
      ...branchFilter,
      status: { $in: ["pending", "preparing", "ready", "served"] },
      table_number: { $ne: null }
    });

    // 4: Kitchen Load: active pending/preparing orders
    const activeKitchenOrdersCount = await Order.countDocuments({
      ...branchFilter,
      status: { $in: ["pending", "preparing"] }
    });

    let kitchenLoad = "Low";
    let kitchenLoadVariant: "success" | "warning" | "danger" = "success";
    if (activeKitchenOrdersCount > 8) {
      kitchenLoad = "High";
      kitchenLoadVariant = "danger";
    } else if (activeKitchenOrdersCount > 2) {
      kitchenLoad = "Medium";
      kitchenLoadVariant = "warning";
    }

    metrics = [
      {
        label: "Revenue (Today)",
        value: `PKR ${todayRevenue.toLocaleString()}`,
        tone: "primary" as const,
      },
      {
        label: "Orders (Today)",
        value: String(todayOrdersCount),
        tone: "default" as const,
      },
      {
        label: "Open Tables",
        value: String(openTablesCount),
        tone: "default" as const,
      },
      {
        label: "Kitchen Load",
        value: kitchenLoad,
        tone: "default" as const,
        variant: kitchenLoadVariant,
      },
    ];
  }

  // Filter shortcuts according to user permissions
  const allowedShortcuts = SHORTCUT_METADATA.filter((sc) =>
    roleHasNavAccess(role, sc.key)
  );

  const displayTitle = role === "admin"
    ? "Overall system dashboard."
    : session.branch
      ? `${session.branch.name} operational portal.`
      : "Your quiet workspace.";

  const displayDescription = role === "admin"
    ? "Overview of performance, system activities, and configurations across all restaurant branches."
    : role === "manager"
      ? `Real-time manager workspace for ${session.branch?.name || "your branch"} — staff, inventory, orders, and sales.`
      : `Point-of-sale and kitchen portal for ${session.branch?.name || "KR Restaurant"}. Dedicated counters and live queue.`;

  return (
    <div className="grid gap-10">
      <PageHeader
        eyebrow={`Welcome back, ${session.name}`}
        title={displayTitle}
        description={displayDescription}
        right={
          roleHasNavAccess(role, "place-order") && (
            <Button asChild size="sm">
              <Link href="/pos/place-order">
                <Plus className="size-4" />
                New order
              </Link>
            </Button>
          )
        }
      />

      {showMetrics && metrics && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <Card key={m.label} className="relative overflow-hidden transition-all duration-300 hover:shadow-sm">
              <CardContent className="p-6 flex flex-col justify-between h-full min-h-[120px]">
                <span className="text-[12.5px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  {m.label}
                </span>
                <div className="mt-4 flex items-baseline justify-between">
                  <span
                    className={`font-display text-[26px] font-bold tracking-tight tabular-nums ${
                      m.tone === "primary"
                        ? "text-[hsl(var(--primary))]"
                        : "text-[hsl(var(--foreground))]"
                    }`}
                  >
                    {m.value}
                  </span>
                  {m.label === "Kitchen Load" && m.variant && (
                    <Badge variant={m.variant} dot className="h-5 px-2 text-[10px]">
                      {m.value}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <section className="grid gap-6">
        <div>
          <h2 className="text-eyebrow mb-4">Quick Shortcuts</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {allowedShortcuts.map((sc) => {
              const Icon = sc.icon;
              return (
                <Link
                  key={sc.href}
                  href={sc.href}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-[16px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[hsl(var(--border-strong))]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className={`p-3 rounded-[12px] border ${sc.color} ${sc.hoverColor} transition-all duration-300`}>
                      <Icon className="size-5 shrink-0" />
                    </div>
                    <span className="rounded-full border border-[hsl(var(--border))] p-1 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <ArrowRight className="size-3.5 shrink-0 -rotate-45" />
                    </span>
                  </div>

                  <div className="mt-6">
                    <h3 className="font-semibold text-[14px] leading-snug tracking-tight text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors duration-200">
                      {sc.title}
                    </h3>
                    <p className="mt-1.5 text-[12px] leading-normal text-[hsl(var(--muted-foreground))]">
                      {sc.hint}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
