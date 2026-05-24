"use client";

import * as React from "react";
import { Loader2, Lock, RefreshCw, ShieldCheck } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 5_000;

/**
 * Lockout shown to users whose email is verified but whose account has not
 * yet been approved by an admin. Mirrors `EmailVerificationLock` so the two
 * gates feel like one story to the user — the moment an admin flips them
 * to approved (Users page → Approve), this view dissolves automatically.
 */
export function PendingApprovalLock() {
  const { user, refresh, logout } = useAuth();
  const [checking, setChecking] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const id = window.setInterval(() => {
      if (cancelled) return;
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [refresh]);

  async function onCheckAgain() {
    setChecking(true);
    try {
      await refresh();
    } finally {
      setChecking(false);
    }
  }

  async function onSignOut() {
    setSigningOut(true);
    try {
      await logout();
      window.location.assign("/login");
    } finally {
      setSigningOut(false);
    }
  }

  const role = user?.role ?? "your account";

  return (
    <div
      className={cn(
        "relative isolate flex min-h-[calc(100dvh-180px)] w-full items-center justify-center",
        "px-4 py-10 sm:px-6 animate-kr-fade-in",
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute left-1/2 top-1/4 size-[560px] -translate-x-1/2 rounded-full opacity-[0.42] blur-[120px]"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.18), transparent 60%)",
          }}
        />
      </div>

      <div
        className={cn(
          "w-full max-w-[480px]",
          "rounded-[18px] border border-[hsl(var(--border))]",
          "bg-[hsl(var(--card))]",
          "shadow-[0_30px_60px_-30px_hsl(0_0%_0%/0.8)]",
          "p-7 sm:p-9",
        )}
      >
        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              "relative grid size-14 place-items-center rounded-[14px]",
              "border border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.12)]",
              "text-[hsl(var(--primary))]",
            )}
          >
            <Lock className="size-6" />
            <span
              className={cn(
                "absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full",
                "border border-[hsl(var(--border))] bg-[hsl(var(--background))]",
                "text-[hsl(var(--muted-foreground))]",
              )}
            >
              <ShieldCheck className="size-3" />
            </span>
          </div>

          <div className="mt-5 text-eyebrow">Awaiting approval</div>

          <h1 className="mt-3 font-display text-[24px] leading-tight tracking-[-0.018em] sm:text-[26px]">
            An admin needs to approve your account.
          </h1>

          <p className="mx-auto mt-3 max-w-[40ch] text-[13.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
            Your email is verified — thanks. Your <span className="capitalize font-medium text-[hsl(var(--foreground))]">{role}</span>{" "}
            account is pending review. You&apos;ll get full access the moment
            an admin approves you in the Users page.
          </p>
        </div>

        <div className="mt-7 grid gap-2.5">
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={onCheckAgain}
            disabled={checking}
          >
            {checking ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {checking ? "Checking…" : "Check approval status"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={onSignOut}
            disabled={signingOut}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>

        <p className="mt-5 text-center text-[11.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
          This page unlocks automatically the moment an admin approves you.
        </p>
      </div>
    </div>
  );
}
