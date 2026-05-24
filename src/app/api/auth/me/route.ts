import { NextResponse } from "next/server";

import { getSessionUserAny } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUserAny();
  if (!session) {
    return NextResponse.json({ ok: true, user: null });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: session.id,
      name: session.name,
      email: session.email,
      role: session.role,
      approval_status: session.approval_status,
      email_verified: session.email_verified,
      branch: session.branch,
    },
  });
}

