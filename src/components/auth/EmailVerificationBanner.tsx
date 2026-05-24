"use client";

import * as React from "react";
import { Loader2, MailWarning, RefreshCw, X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/toast";
import { apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const DISMISS_STORAGE_KEY = "kr.emailVerifyBanner.dismissedAt";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

export function EmailVerificationBanner() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [dismissed, setDismissed] = React.useState(false);
  const [resending, setResending] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const at = Number(window.localStorage.getItem(DISMISS_STORAGE_KEY) ?? 0);
      if (at && Date.now() - at < DISMISS_TTL_MS) {
        setDismissed(true);
      }
    } catch {
      // localStorage may be unavailable — that's fine, banner shows.
    }
  }, []);

  if (loading || !user) return null;
  if (user.email_verified) return null;
  if (dismissed) return null;

  function onDismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }

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

  return (
    <div
      className={cn(
        "relative isolate w-full border-b border-[hsl(var(--primary)/0.22)]",
        "bg-[linear-gradient(180deg,hsl(var(--primary)/0.10)_0%,hsl(var(--primary)/0.04)_100%)]",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1320px] items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-10">
        <div className="grid size-7 shrink-0 place-items-center rounded-[8px] border border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.18)] text-[hsl(var(--primary))]">
          <MailWarning className="size-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] leading-tight">
            <span className="font-semibold text-[hsl(var(--foreground))]">
              Verify your email
            </span>{" "}
            <span className="text-[hsl(var(--muted-foreground))]">
              — we sent a confirmation link to{" "}
              <span className="font-medium text-[hsl(var(--foreground))]">
                {user.email}
              </span>
              .
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5",
            "border-[hsl(var(--primary)/0.45)] bg-[hsl(var(--primary)/0.12)]",
            "text-[12px] font-medium text-[hsl(var(--foreground))]",
            "transition-colors hover:bg-[hsl(var(--primary)/0.18)]",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {resending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <RefreshCw className="size-3" />
          )}
          <span className="hidden sm:inline">
            {resending ? "Sending…" : "Resend email"}
          </span>
          <span className="sm:hidden">{resending ? "…" : "Resend"}</span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={cn(
            "inline-grid size-7 place-items-center rounded-[8px]",
            "text-[hsl(var(--muted-foreground))]",
            "transition-colors hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]",
          )}
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
