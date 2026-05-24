import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/AppShell";
import { EmailVerificationLock } from "@/components/auth/EmailVerificationLock";
import { PendingApprovalLock } from "@/components/auth/PendingApprovalLock";
import { getSessionUserAny } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUserAny();
  if (!session) {
    redirect("/");
  }

  // The shell stays mounted so the brand, nav, and account menu remain visible
  // (logout still works, support is one click away), but the entire actionable
  // area is replaced with a single-purpose lock card. Children are not rendered
  // at all, so we don't waste cycles fetching data the user can't use.
  //
  // Order of gates: email verification first (we can't trust the address yet),
  // then admin approval (we trust them, but a human still has to greenlight
  // them). Both gates poll `/api/auth/me` and dissolve automatically.
  if (!session.email_verified) {
    return (
      <AppShell>
        <EmailVerificationLock />
      </AppShell>
    );
  }

  if (session.approval_status !== "approved") {
    return (
      <AppShell>
        <PendingApprovalLock />
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}
