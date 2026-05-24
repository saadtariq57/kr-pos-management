import { NextRequest } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Reservation } from "@/models";
import { jsonError, jsonOk, parseListQuery } from "@/app/api/_utils";

export async function GET(req: NextRequest) {
  await connectDB();
  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Reservation.find().sort({ reservation_date: -1 }).skip(skip).limit(limit).lean(),
    Reservation.countDocuments(),
  ]);

  return jsonOk({ items, page, limit, total });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  if (
    !body?.customer_id ||
    !body?.table_number ||
    !body?.reservation_date ||
    !body?.reservation_time ||
    !body?.status
  ) {
    return jsonError(
      "customer_id, table_number, reservation_date, reservation_time and status are required",
    );
  }

  try {
    const reservation = await Reservation.create({
      customer_id: body.customer_id,
      table_number: body.table_number,
      reservation_date: body.reservation_date,
      reservation_time: body.reservation_time,
      status: body.status,
    });
    return jsonOk({ ok: true, reservation });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create reservation";
    return jsonError(msg, 400);
  }
}

