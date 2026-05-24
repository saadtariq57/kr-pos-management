import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";
import { verifyAuthToken } from "@/lib/auth-jwt";
import { connectDB } from "@/lib/mongodb";
import { Branch, User } from "@/models";

export type SessionBranch = {
  id: string;
  name: string;
  city: string;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  approval_status: "pending" | "approved";
  email_verified: boolean;
  branch: SessionBranch | null;
};

function normalizeApproval(v: unknown): "pending" | "approved" {
  if (v === "pending") return "pending";
  return "approved";
}

/**
 * Resolves the branch attached to a user (if any) into a small DTO suitable
 * for the topbar/account-menu. Admins typically have `branch_id = null` and
 * receive `null` back, which the UI renders as "All branches".
 */
async function resolveSessionBranch(
  branchId: unknown,
): Promise<SessionBranch | null> {
  if (!branchId) return null;
  const branch = await Branch.findById(branchId)
    .select("_id name city")
    .lean<{ _id: unknown; name: string; city: string } | null>();
  if (!branch) return null;
  return { id: String(branch._id), name: branch.name, city: branch.city };
}

/**
 * Loads the user from the auth cookie. Returns null if the session is missing,
 * invalid, inactive, or — importantly — has not yet verified their email.
 *
 * Every business API in the app calls this helper, so a single check here
 * locks every protected endpoint behind email verification. The UI shows a
 * dedicated lock screen so users never see these 401s in practice; this is
 * the defense-in-depth layer that catches anyone calling the APIs directly.
 */
export async function getSessionUserApproved(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const payload = verifyAuthToken(token);
    await connectDB();
    const doc = await User.findById(payload.sub).lean();
    if (!doc) return null;
    const u = doc as {
      _id: unknown;
      name: string;
      email: string;
      role: string;
      branch_id?: unknown;
      is_active?: boolean;
      approval_status?: string;
      email_verified?: boolean;
    };
    if (u.is_active === false) return null;
    if (u.email_verified !== true) return null;
    const approval = normalizeApproval(u.approval_status);
    // Pending accounts are blocked from every protected API. The UI shows a
    // dedicated lock screen via `getSessionUserAny`; here we just say "no".
    if (approval !== "approved") return null;
    const branch = await resolveSessionBranch(u.branch_id);

    return {
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      approval_status: approval,
      email_verified: true,
      branch,
    };
  } catch {
    return null;
  }
}

/**
 * Same as session lookup but includes pending and unverified users (for
 * `/api/auth/me` and the `pos` layout's lock screens).
 */
export async function getSessionUserAny(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const payload = verifyAuthToken(token);
    await connectDB();
    const doc = await User.findById(payload.sub).lean();
    if (!doc) return null;
    const u = doc as {
      _id: unknown;
      name: string;
      email: string;
      role: string;
      branch_id?: unknown;
      is_active?: boolean;
      approval_status?: string;
      email_verified?: boolean;
    };
    if (u.is_active === false) return null;
    const branch = await resolveSessionBranch(u.branch_id);

    return {
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      approval_status: normalizeApproval(u.approval_status),
      email_verified: Boolean(u.email_verified),
      branch,
    };
  } catch {
    return null;
  }
}
