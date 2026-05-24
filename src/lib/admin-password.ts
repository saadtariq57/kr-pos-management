import bcrypt from "bcryptjs";

import { User } from "@/models";

/**
 * Re-checks the currently signed-in admin's password against the stored hash.
 *
 * Used by every "destructive" admin action — deactivating a branch, hard
 * deleting a user, etc. — so the API never trusts the session cookie alone for
 * one-way operations. Returns `false` on any failure (missing password, hash
 * lookup miss, mismatch) so callers can return a generic 401 without leaking
 * which leg of the check failed.
 */
export async function verifyAdminPassword(
  sessionUserId: string,
  password: string,
): Promise<boolean> {
  if (!password) return false;
  const admin = await User.findById(sessionUserId)
    .select("password_hash")
    .lean<{ password_hash: string } | null>();
  if (!admin?.password_hash) return false;
  return bcrypt.compare(password, admin.password_hash);
}
