import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from "@/lib/auth-cookie";
import { signAuthToken } from "@/lib/auth-jwt";
import {
  generateEmailVerificationToken,
  getVerificationExpiry,
  sendVerificationEmail,
} from "@/lib/email";
import { connectDB } from "@/lib/mongodb";
import { parseSignupRole, roleRequiresBranch, SIGNUP_ROLES } from "@/lib/rbac";
import { Branch, User } from "@/models";

const VERIFICATION_TTL_HOURS = 24;

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const phone = String(body?.phone ?? "").trim();
    const password = String(body?.password ?? "");
    const role = parseSignupRole(body?.role);

    if (!name || !email || !phone || password.length < 8) {
      return NextResponse.json(
        {
          ok: false,
          error: "name, email, phone and password (min 8) are required",
        },
        { status: 400 },
      );
    }

    if (!role) {
      return NextResponse.json(
        {
          ok: false,
          error: `role must be one of ${SIGNUP_ROLES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    let branchId: mongoose.Types.ObjectId | null = null;
    if (roleRequiresBranch(role)) {
      const raw = String(body?.branch_id ?? "").trim();
      if (!raw || !mongoose.isValidObjectId(raw)) {
        return NextResponse.json(
          { ok: false, error: "Please select a branch for this role" },
          { status: 400 },
        );
      }
      const branch = await Branch.findById(raw)
        .select("_id is_active")
        .lean<{
          _id: mongoose.Types.ObjectId;
          is_active: boolean;
        } | null>();
      if (!branch) {
        return NextResponse.json(
          { ok: false, error: "Selected branch does not exist" },
          { status: 400 },
        );
      }
      if (!branch.is_active) {
        return NextResponse.json(
          {
            ok: false,
            error: "Selected branch is currently deactivated",
          },
          { status: 400 },
        );
      }
      branchId = branch._id;
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Email is already registered" },
        { status: 409 },
      );
    }

    // Bootstrap rule: if no approved admin exists yet, an admin signup is
    // auto-approved so the workspace has a gatekeeper. Every other signup
    // (and any subsequent admin signup) lands as `pending` and waits for
    // an existing admin to approve them from the Users page.
    let approval_status: "pending" | "approved" = "pending";
    if (role === "admin") {
      const existingAdmin = await User.findOne({
        role: "admin",
        approval_status: "approved",
      })
        .select("_id")
        .lean();
      if (!existingAdmin) approval_status = "approved";
    }

    const password_hash = await bcrypt.hash(password, 10);
    const verificationToken = generateEmailVerificationToken();
    const verificationExpires = getVerificationExpiry(VERIFICATION_TTL_HOURS);

    const user = await User.create({
      name,
      email,
      phone,
      password_hash,
      role,
      branch_id: branchId,
      is_active: true,
      approval_status,
      email_verified: false,
      email_verification_token: verificationToken,
      email_verification_expires: verificationExpires,
    });

    // Fire off the verification email. We do not block account creation if
    // SendGrid hiccups — the user can resend from the in-app banner.
    const mailResult = await sendVerificationEmail({
      to: email,
      name,
      token: verificationToken,
      expiresInHours: VERIFICATION_TTL_HOURS,
    });

    // Auto-login: drop a session cookie so the new user lands inside the app.
    const token = signAuthToken({
      sub: String(user._id),
      email,
      name,
      role,
    });

    const jar = await cookies();
    jar.set(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

    await User.updateOne({ _id: user._id }, { $set: { last_login: new Date() } });

    return NextResponse.json({
      ok: true,
      message:
        "Account created. Check your inbox to verify your email address.",
      email_verification: {
        sent: mailResult.ok && !("skipped" in mailResult && mailResult.skipped),
        skipped: "skipped" in mailResult ? Boolean(mailResult.skipped) : false,
        error: !mailResult.ok ? mailResult.error : undefined,
      },
      user: {
        id: String(user._id),
        name,
        email,
        role,
        email_verified: false,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Signup failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
