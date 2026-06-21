import mongoose from "mongoose";
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
  Payroll,
  AnalyticsLog,
} from "@/models";

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
  Payroll,
  AnalyticsLog,
];

/**
 * GET /api/dev/probe-db
 *
 * Dev-only probe:
 * - Connect + ping Atlas
 * - Create collections for every Mongoose model ("tables")
 * - Return which collections were created vs already existed
 */
export async function GET() {
  try {
    await connectDB();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("MongoDB connection is not initialized");
    }

    // Ping the DB to confirm connectivity.
    await db.command({ ping: 1 });

    const results: Record<string, "created" | "exists"> = {};

    await Promise.all(
      models.map(async (Model) => {
        const name = Model.collection.name;
        try {
          await db.createCollection(name);
          results[name] = "created";
        } catch (e) {
          const err = e as unknown as { code?: number; codeName?: string };
          if (err?.codeName === "NamespaceExists" || err?.code === 48) {
            results[name] = "exists";
            return;
          }
          // If it's not "already exists", surface the error.
          throw e;
        }
      }),
    );

    return NextResponse.json({
      ok: true,
      message: "Atlas ping ok; collections ensured for all entities.",
      database: mongoose.connection.name,
      collectionCount: Object.keys(results).length,
      results,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

