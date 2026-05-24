import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from "@/lib/auth-cookie";
import { signAuthToken } from "@/lib/auth-jwt";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "email and password are required" },
        { status: 400 },
      );
    }

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { ok: false, error: "Account is disabled" },
        { status: 403 },
      );
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    user.last_login = new Date();
    await user.save();

    const token = signAuthToken({
      sub: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const jar = await cookies();
    jar.set(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

    return NextResponse.json({
      ok: true,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Login failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

