import { NextRequest } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { AnalyticsLog } from "@/models";
import { jsonError, jsonOk, parseListQuery } from "@/app/api/_utils";

export async function GET(req: NextRequest) {
  await connectDB();
  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    AnalyticsLog.find().sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
    AnalyticsLog.countDocuments(),
  ]);

  return jsonOk({ items, page, limit, total });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  if (!body?.user_id || !body?.activity_type) {
    return jsonError("user_id and activity_type are required");
  }

  try {
    const log = await AnalyticsLog.create({
      user_id: body.user_id,
      activity_type: body.activity_type,
      metadata: body.metadata ?? {},
    });
    return jsonOk({ ok: true, log });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create analytics log";
    return jsonError(msg, 400);
  }
}

