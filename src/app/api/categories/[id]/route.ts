import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { jsonError, jsonOk } from "@/app/api/_utils";
import { getSessionUserApproved } from "@/lib/auth-server";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSessionUserApproved();
  if (!session || session.role !== "admin") {
    return jsonError("Only admins can edit categories", 403);
  }

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) {
    return jsonError("Invalid category id", 400);
  }

  const body = await req.json();
  const $set: Record<string, unknown> = {};

  if (body.category_name != null) {
    const name = String(body.category_name).trim();
    if (!name) return jsonError("category_name cannot be empty", 400);
    $set.category_name = name;
  }
  if (body.description !== undefined) {
    $set.description = String(body.description ?? "");
  }
  if (body.is_active != null) {
    $set.is_active = Boolean(body.is_active);
  }

  if (Object.keys($set).length === 0) {
    return jsonError("No valid fields to update", 400);
  }

  await connectDB();
  const category = await Category.findByIdAndUpdate(
    id,
    { $set },
    { new: true },
  ).lean();
  if (!category) {
    return jsonError("Category not found", 404);
  }

  return jsonOk({ ok: true, category });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSessionUserApproved();
  if (!session || session.role !== "admin") {
    return jsonError("Only admins can delete categories", 403);
  }

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) {
    return jsonError("Invalid category id", 400);
  }

  await connectDB();
  const removed = await Category.findByIdAndDelete(id).select("_id").lean();
  if (!removed) {
    return jsonError("Category not found", 404);
  }

  return jsonOk({ ok: true });
}
