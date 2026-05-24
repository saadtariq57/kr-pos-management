import { NextResponse } from "next/server";

import { connectDB, getMongoUriConfigured } from "@/lib/mongodb";

/**
 * GET /api/health/db — quick check that MongoDB is reachable.
 */
export async function GET() {
  if (!getMongoUriConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "MONGODB_URI is not set. Add it to .env.local.",
      },
      { status: 503 },
    );
  }

  try {
    await connectDB();
    return NextResponse.json({ ok: true, message: "Connected to MongoDB." });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
