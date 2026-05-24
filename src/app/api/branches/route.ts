import { NextRequest } from "next/server";

import { getSessionUserApproved } from "@/lib/auth-server";
import { connectDB } from "@/lib/mongodb";
import { canManageBranches } from "@/lib/rbac";
import { Branch } from "@/models";
import { jsonError, jsonOk, parseListQuery } from "@/app/api/_utils";

/**
 * GET /api/branches
 *
 * Public by default — returns only active branches with minimal fields for
 * lightweight branch pickers.
 *
 * Admins (with ?all=true) get the full collection including inactive entries
 * with their full metadata.
 */
export async function GET(req: NextRequest) {
  await connectDB();
  const url = new URL(req.url);
  const wantAll = url.searchParams.get("all") === "true";

  if (wantAll) {
    const session = await getSessionUserApproved();
    if (!session || !canManageBranches(session.role)) {
      return jsonError("Forbidden", 403);
    }

    const { page, limit } = parseListQuery(req);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Branch.find().sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      Branch.countDocuments(),
    ]);
    return jsonOk({ items, page, limit, total });
  }

  const items = await Branch.find({ is_active: true })
    .select("_id name city")
    .sort({ name: 1 })
    .lean();
  return jsonOk({ items, page: 1, limit: items.length, total: items.length });
}

/**
 * POST /api/branches  (admin only)
 * Body: { name, city, address, phone? }
 */
export async function POST(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session || !canManageBranches(session.role)) {
    return jsonError("Forbidden", 403);
  }

  await connectDB();
  const body = await req.json();
  const name = String(body?.name ?? "").trim();
  const city = String(body?.city ?? "").trim();
  const address = String(body?.address ?? "").trim();
  const phone = String(body?.phone ?? "").trim();

  if (!name || !city || !address) {
    return jsonError("name, city and address are required");
  }

  try {
    const existing = await Branch.findOne({ name }).lean();
    if (existing) {
      return jsonError("A branch with this name already exists", 409);
    }
    const branch = await Branch.create({
      name,
      city,
      address,
      phone,
      is_active: true,
    });
    return jsonOk({ ok: true, branch });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create branch";
    return jsonError(msg, 400);
  }
}
