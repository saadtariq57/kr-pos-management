import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { User } from "@/models";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token ?? "").trim();

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Verification token is required." },
        { status: 400 },
      );
    }

    await connectDB();

    const user = await User.findOne({ email_verification_token: token });
    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This verification link is invalid or has already been used. Request a new one from the app.",
        },
        { status: 400 },
      );
    }

    if (user.email_verified) {
      return NextResponse.json({
        ok: true,
        already: true,
        message: "Your email is already verified.",
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name,
        },
      });
    }

    const expiresAt: Date | null = user.email_verification_expires ?? null;
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        {
          ok: false,
          expired: true,
          error:
            "This verification link has expired. Request a fresh one from the app.",
        },
        { status: 410 },
      );
    }

    user.email_verified = true;
    user.email_verified_at = new Date();
    user.email_verification_token = null;
    user.email_verification_expires = null;
    await user.save();

    return NextResponse.json({
      ok: true,
      message: "Email verified successfully.",
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Verification failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
