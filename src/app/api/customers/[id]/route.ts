import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { jsonError, jsonOk } from "@/app/api/_utils";
import { getSessionUserApproved } from "@/lib/auth-server";
import { connectDB } from "@/lib/mongodb";
import { Customer } from "@/models";
import { isValidPhone, PHONE_HINT } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSessionUserApproved();
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) {
    return jsonError("Invalid customer id", 400);
  }

  const body = await req.json();
  const $set: Record<string, unknown> = {};

  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name) return jsonError("name cannot be empty", 400);
    $set.name = name;
  }
  if (body.phone != null) {
    const phone = String(body.phone).trim();
    if (!isValidPhone(phone)) return jsonError(PHONE_HINT, 400);
    $set.phone = phone;
  }
  if (body.email !== undefined) {
    const email = body.email == null ? "" : String(body.email).trim();
    $set.email = email ? email : null;
  }

  if (Object.keys($set).length === 0) {
    return jsonError("No valid fields to update", 400);
  }

  await connectDB();
  const customer = await Customer.findByIdAndUpdate(
    id,
    { $set },
    { new: true },
  ).lean();
  if (!customer) {
    return jsonError("Customer not found", 404);
  }

  return jsonOk({ ok: true, customer });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSessionUserApproved();
  if (!session) {
    return jsonError("Unauthorized", 401);
  }
  if (session.role !== "admin") {
    return jsonError("Only admins can delete customers", 403);
  }

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) {
    return jsonError("Invalid customer id", 400);
  }

  await connectDB();
  const removed = await Customer.findByIdAndDelete(id).select("_id").lean();
  if (!removed) {
    return jsonError("Customer not found", 404);
  }

  return jsonOk({ ok: true });
}
