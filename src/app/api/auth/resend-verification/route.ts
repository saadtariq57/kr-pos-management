import { NextResponse } from "next/server";

import { getSessionUserAny } from "@/lib/auth-server";
import {
  generateEmailVerificationToken,
  getVerificationExpiry,
  sendVerificationEmail,
} from "@/lib/email";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models";

export const dynamic = "force-dynamic";

const VERIFICATION_TTL_HOURS = 24;
const RESEND_COOLDOWN_MS = 60 * 1000; // 60s between sends per user

export async function POST() {
  try {
    const session = await getSessionUserAny();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "You must be signed in to resend verification." },
        { status: 401 },
      );
    }

    await connectDB();
    const user = await User.findById(session.id);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Account not found." },
        { status: 404 },
      );
    }

    if (user.email_verified) {
      return NextResponse.json({
        ok: true,
        already: true,
        message: "Your email is already verified.",
      });
    }

    // Throttle: don't blast SendGrid if the user smashes the button.
    const lastSent: Date | null = user.email_verification_expires
      ? new Date(
          user.email_verification_expires.getTime() -
            VERIFICATION_TTL_HOURS * 60 * 60 * 1000,
        )
      : null;
    if (lastSent && Date.now() - lastSent.getTime() < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil(
        (RESEND_COOLDOWN_MS - (Date.now() - lastSent.getTime())) / 1000,
      );
      return NextResponse.json(
        {
          ok: false,
          error: `Please wait ${wait}s before requesting another email.`,
        },
        { status: 429 },
      );
    }

    const token = generateEmailVerificationToken();
    user.email_verification_token = token;
    user.email_verification_expires = getVerificationExpiry(
      VERIFICATION_TTL_HOURS,
    );
    await user.save();

    const result = await sendVerificationEmail({
      to: user.email,
      name: user.name,
      token,
      expiresInHours: VERIFICATION_TTL_HOURS,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      skipped: "skipped" in result ? Boolean(result.skipped) : false,
      message: "Verification email sent. Check your inbox.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Resend failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
