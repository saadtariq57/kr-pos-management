import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import {
  User,
  Role,
  Customer,
  Order,
  OrderItem,
  Payment,
  Category,
  MenuItem,
  Inventory,
  Supplier,
  Purchase,
  SalesSummary,
  Expense,
  Reservation,
  Employee,
  Attendance,
  Payroll,
  AnalyticsLog,
} from "@/models";

/**
 * GET /api/dev/sync-models
 *
 * Dev endpoint to verify DB connection + schema compilation.
 * It calls `syncIndexes()` for each model.
 */
export async function GET() {
  try {
    await connectDB();

    const models = [
      User,
      Role,
      Customer,
      Order,
      OrderItem,
      Payment,
      Category,
      MenuItem,
      Inventory,
      Supplier,
      Purchase,
      SalesSummary,
      Expense,
      Reservation,
      Employee,
      Attendance,
      Payroll,
      AnalyticsLog,
    ];

    await Promise.all(models.map((m) => m.syncIndexes()));

    return NextResponse.json({
      ok: true,
      message: "Models synced (indexes checked) successfully.",
      modelCount: models.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

