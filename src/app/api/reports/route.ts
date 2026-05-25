import { NextRequest } from "next/server";

import { getSessionUserApproved } from "@/lib/auth-server";
import { connectDB } from "@/lib/mongodb";
import { isAdmin } from "@/lib/rbac";
import { Order, Expense, OrderItem, Category } from "@/models";
import { jsonError, jsonOk } from "@/app/api/_utils";

export async function GET(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session || (session.role !== "admin" && session.role !== "manager")) {
    return jsonError("Forbidden", 403);
  }

  await connectDB();

  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "30d";

  // Process date bounds
  const now = new Date();
  let startDate = new Date();

  if (range === "7d") {
    startDate.setDate(now.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
  } else if (range === "this_month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  } else {
    // Default to 30d
    startDate.setDate(now.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);
  }

  // Process branch scopes
  const branchFilter: Record<string, any> = {};
  if (isAdmin(session.role)) {
    const branchId = url.searchParams.get("branch_id");
    if (branchId && branchId !== "all" && branchId.trim() !== "") {
      branchFilter.branch_id = branchId;
    }
  } else {
    if (session.branch?.id) {
      branchFilter.branch_id = session.branch.id;
    } else {
      return jsonError("Manager has no branch scope", 400);
    }
  }

  try {
    // Fetch orders and expenses in parallel
    const [orders, expenses, categories] = await Promise.all([
      Order.find({
        ...branchFilter,
        status: { $in: ["completed", "served"] },
        created_at: { $gte: startDate, $lte: now },
      }).lean<any[]>(),
      Expense.find({
        ...branchFilter,
        expense_date: { $gte: startDate, $lte: now },
      }).lean<any[]>(),
      Category.find({ is_active: true }).lean<any[]>(),
    ]);

    // Fetch order items for items metrics
    const orderIds = orders.map((o) => o._id);
    const orderItems = await OrderItem.find({
      order_id: { $in: orderIds },
    })
      .populate("menu_item_id")
      .lean<any[]>();

    // 1. Dynamic Timeseries Chart Map
    const timeseriesMap = new Map<
      string,
      { date: string; revenue: number; expenses: number; orders: number }
    >();
    let iter = new Date(startDate);
    while (iter <= now) {
      const key = iter.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      timeseriesMap.set(key, { date: key, revenue: 0, expenses: 0, orders: 0 });
      iter.setDate(iter.getDate() + 1);
    }

    orders.forEach((o) => {
      const dt = new Date(o.created_at);
      const key = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (timeseriesMap.has(key)) {
        const val = timeseriesMap.get(key)!;
        val.revenue += o.final_amount;
        val.orders += 1;
      }
    });

    expenses.forEach((e) => {
      const dt = new Date(e.expense_date);
      const key = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (timeseriesMap.has(key)) {
        const val = timeseriesMap.get(key)!;
        val.expenses += e.amount;
      }
    });

    const timeseries = Array.from(timeseriesMap.values());

    // 2. Category Breakdown
    const categorySalesMap = new Map<string, number>();
    orderItems.forEach((oi) => {
      const item = oi.menu_item_id as any;
      if (item && item.category_id) {
        const catId = String(item.category_id);
        categorySalesMap.set(catId, (categorySalesMap.get(catId) || 0) + oi.quantity);
      }
    });

    const categoryBreakdown = categories
      .map((c) => ({
        name: c.category_name,
        value: categorySalesMap.get(String(c._id)) || 0,
      }))
      .filter((cat) => cat.value > 0);

    // 3. Top Selling Items
    const itemSalesMap = new Map<
      string,
      { name: string; quantity: number; revenue: number }
    >();
    orderItems.forEach((oi) => {
      const item = oi.menu_item_id as any;
      if (item) {
        const itemId = String(item._id);
        if (!itemSalesMap.has(itemId)) {
          itemSalesMap.set(itemId, { name: item.item_name, quantity: 0, revenue: 0 });
        }
        const val = itemSalesMap.get(itemId)!;
        val.quantity += oi.quantity;
        val.revenue += oi.total_price;
      }
    });

    const topSellingItems = Array.from(itemSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 4. Totals and Summaries
    const totalRevenue = orders.reduce((sum, o) => sum + o.final_amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
    const totalTax = orders.reduce((sum, o) => sum + o.tax_amount, 0);
    const totalDiscount = orders.reduce((sum, o) => sum + o.discount_amount, 0);
    const totalSubtotal = orders.reduce((sum, o) => sum + o.subtotal_amount, 0);
    const totalUnitsSold = orderItems.reduce((sum, oi) => sum + oi.quantity, 0);
    const expenseCount = expenses.length;

    return jsonOk({
      totalRevenue,
      totalExpenses,
      netProfit,
      avgOrderValue,
      orderCount: orders.length,
      totalTax,
      totalDiscount,
      totalSubtotal,
      totalUnitsSold,
      expenseCount,
      timeseries,
      categoryBreakdown,
      topSellingItems,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load reports";
    return jsonError(msg, 500);
  }
}
