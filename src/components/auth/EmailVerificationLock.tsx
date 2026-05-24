"use client";

import * as React from "react";
import { Loader2, Lock, MailCheck, RefreshCw } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 5_000;

/**
 * Full-bleed lockout shown inside the POS app shell when the signed-in user
 * has not yet verified their email. The shell (sidebar, topbar, etc.) stays
 * visible so users keep their bearings; only the actionable surface area is
 * gated behind a calm, single-purpose card.
 */
export function EmailVerificationLock() {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const [resending, setResending] = React.useState(false);
  const [checking, setChecking] = React.useState(false);

  // Quietly re-check the session every few seconds. The moment the user
  // verifies in another tab, this view dissolves and the real app appears
  // — no manual reload required.
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

  async function onResend() {
    setResending(true);
    try {
      const res = await apiPost<{ ok: true; message?: string }>(
        "/api/auth/resend-verification",
        {},
      );
      toast({
        tone: "success",
        title: "Email sent",
        description: res.message ?? "Verification email is on its way.",
      });
    } catch (err) {
      toast({
        tone: "danger",
        title: "Couldn't resend",
        description:
          err instanceof Error
            ? err.message
            : "Something went wrong. Try again in a moment.",
      });
    } finally {
      setResending(false);
    }
  }

  async function onIveVerified() {
    setChecking(true);
    try {
      await refresh();
    } finally {
      setChecking(false);
    }
  }

  const email = user?.email ?? "your email";

  return (
    <div
      className={cn(
        "relative isolate flex min-h-[calc(100dvh-180px)] w-full items-center justify-center",
        "px-4 py-10 sm:px-6 animate-kr-fade-in",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
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
              <MailCheck className="size-3" />
            </span>
          </div>

          <div className="mt-5 text-eyebrow">Workspace locked</div>

          <h1 className="mt-3 font-display text-[24px] leading-tight tracking-[-0.018em] sm:text-[26px]">
            Verify your email to continue.
          </h1>

          <p className="mx-auto mt-3 max-w-[40ch] text-[13.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
            We sent a confirmation link to{" "}
            <span className="font-medium text-[hsl(var(--foreground))]">
              {email}
            </span>
            . Click it to unlock orders, menu, payments, and everything else in
            KR Restaurant.
          </p>
        </div>

        <div className="mt-7 grid gap-2.5">
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={onResend}
            disabled={resending}
          >
            {resending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {resending ? "Sending…" : "Resend verification email"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={onIveVerified}
            disabled={checking}
          >
            {checking ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MailCheck className="size-4" />
            )}
            {checking ? "Checking…" : "I've verified — refresh"}
          </Button>
        </div>

        <p className="mt-5 text-center text-[11.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
          Can&apos;t find it? Check your spam folder. This page unlocks
          automatically the moment your email is confirmed.
        </p>
      </div>
    </div>
  );
}
