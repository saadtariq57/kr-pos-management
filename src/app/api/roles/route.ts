import { NextRequest } from "next/server";

import { getSessionUserApproved } from "@/lib/auth-server";
import { connectDB } from "@/lib/mongodb";
import {
  APP_ROLES,
  canManageStaffUsers,
  ROLE_DEFINITIONS,
  type KnownRole,
} from "@/lib/rbac";
import { Role } from "@/models";
import { jsonError, jsonOk, parseListQuery } from "@/app/api/_utils";

/**
 * Upsert the canonical roles defined in `rbac.ts` into the `roles` collection.
 *
 * The roles collection is essentially a *projection* of the hard-coded RBAC
 * map: it gives admin-facing role references a database-backed list to render
 * without forcing the front-end to know about the canonical permission set.
 * Running this on every list call keeps the doc in lock-step with the source
 * of truth even after rbac.ts edits — and the writes are idempotent thanks
 * to the unique index on `role_name`.
 */
async function syncCanonicalRoles() {
  await Promise.all(
    ROLE_DEFINITIONS.map((def) =>
      Role.updateOne(
        { role_name: def.role_name },
        {
          $set: { permissions: def.permissions },
          $setOnInsert: { role_name: def.role_name, created_at: new Date() },
        },
        { upsert: true },
      ),
    ),
  );
}

const ROLE_ORDER = new Map<string, number>(
  APP_ROLES.map((r, i) => [r, i] as const),
);

export async function GET(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session || !canManageStaffUsers(session.role)) {
    return jsonError("Forbidden", 403);
  }

  await connectDB();
  await syncCanonicalRoles();

  const { page, limit } = parseListQuery(req);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Role.find().skip(skip).limit(limit).lean(),
    Role.countDocuments(),
  ]);

  // Sort by the canonical role hierarchy (admin → manager → … → hr) and put
  // any unknown / bespoke roles at the bottom in alphabetical order.
  const sorted = [...items].sort((a, b) => {
    const ai = ROLE_ORDER.has(a.role_name)
      ? (ROLE_ORDER.get(a.role_name) as number)
      : Number.MAX_SAFE_INTEGER;
    const bi = ROLE_ORDER.has(b.role_name)
      ? (ROLE_ORDER.get(b.role_name) as number)
      : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return a.role_name.localeCompare(b.role_name);
  });

  const definitions = ROLE_DEFINITIONS.reduce(
    (acc, def) => {
      acc[def.role_name] = {
        description: def.description,
        badge: def.badge,
      };
      return acc;
    },
    {} as Record<KnownRole, { description: string; badge: string }>,
  );

  return jsonOk({ items: sorted, page, limit, total, definitions });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserApproved();
  if (!session || !canManageStaffUsers(session.role)) {
    return jsonError("Forbidden", 403);
  }

  await connectDB();
  const body = await req.json();

  if (!body?.role_name) {
    return jsonError("role_name is required");
  }

  try {
    const role = await Role.create({
      role_name: body.role_name,
      permissions: body.permissions ?? [],
    });
    return jsonOk({ ok: true, role });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create role";
    return jsonError(msg, 400);
  }
}
