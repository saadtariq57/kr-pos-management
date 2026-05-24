"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  MailCheck,
  RefreshCw,
} from "lucide-react";

import { AuthFormCard } from "@/components/auth/AuthFormCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api-client";

type Status = "verifying" | "success" | "already" | "expired" | "error";

export function VerifyEmailClient() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const { user, refresh } = useAuth();

  const [status, setStatus] = React.useState<Status>("verifying");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [resending, setResending] = React.useState(false);
  const [resentMsg, setResentMsg] = React.useState<string | null>(null);
  const ran = React.useRef(false);

  React.useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setStatus("error");
      setErrorMsg("This page expects a verification token in the URL.");
      return;
    }

    void (async () => {
      try {
        const res = await apiPost<{
          ok: true;
          already?: boolean;
          message?: string;
        }>("/api/auth/verify-email", { token });
        setStatus(res.already ? "already" : "success");
        // Refresh auth context so any banner updates.
        void refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Verification failed";
        if (/expired/i.test(msg)) {
          setStatus("expired");
        } else {
          setStatus("error");
        }
        setErrorMsg(msg);
      }
    })();
  }, [token, refresh]);

  async function onResend() {
    setResending(true);
    setResentMsg(null);
    try {
      await apiPost<{ ok: true; message?: string }>(
        "/api/auth/resend-verification",
        {},
      );
      setResentMsg("New verification email sent. Check your inbox.");
    } catch (err) {
      setResentMsg(
        err instanceof Error ? err.message : "Could not resend email.",
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthFormCard eyebrow="Email verification">
      {status === "verifying" ? (
        <VerifyingView />
      ) : status === "success" ? (
        <SuccessView signedIn={Boolean(user)} />
      ) : status === "already" ? (
        <AlreadyView signedIn={Boolean(user)} />
      ) : status === "expired" ? (
        <ExpiredView
          signedIn={Boolean(user)}
          onResend={onResend}
          resending={resending}
          resentMsg={resentMsg}
        />
      ) : (
        <ErrorView
          message={errorMsg}
          signedIn={Boolean(user)}
          onResend={onResend}
          resending={resending}
          resentMsg={resentMsg}
        />
      )}
    </AuthFormCard>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function IconBadge({
  tone,
  children,
}: {
  tone: "primary" | "success" | "danger";
  children: React.ReactNode;
}) {
  const cls =
    tone === "success"
      ? "border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]"
      : tone === "danger"
        ? "border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]"
        : "border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]";
  return (
    <div
      className={`mb-4 inline-grid size-11 place-items-center rounded-[12px] border ${cls}`}
    >
      {children}
    </div>
  );
}

function VerifyingView() {
  return (
    <div className="grid place-items-center text-center">
      <IconBadge tone="primary">
        <Loader2 className="size-5 animate-spin" />
      </IconBadge>
      <h1 className="font-display text-[22px] leading-tight tracking-[-0.015em]">
        Verifying your email…
      </h1>
      <p className="mt-1.5 text-[13px] text-[hsl(var(--muted-foreground))]">
        This will only take a second.
      </p>
    </div>
  );
}

function SuccessView({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="grid place-items-center text-center">
      <IconBadge tone="success">
        <CheckCircle2 className="size-5" />
      </IconBadge>
      <h1 className="font-display text-[22px] leading-tight tracking-[-0.015em]">
        You&apos;re verified.
      </h1>
      <p className="mt-1.5 text-[13px] text-[hsl(var(--muted-foreground))]">
        Your email is confirmed and your account is fully active.
      </p>

      <Button asChild size="lg" className="mt-6 w-full">
        <Link href={signedIn ? "/pos" : "/login"}>
          {signedIn ? "Continue to POS" : "Sign in"}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

function AlreadyView({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="grid place-items-center text-center">
      <IconBadge tone="success">
        <MailCheck className="size-5" />
      </IconBadge>
      <h1 className="font-display text-[22px] leading-tight tracking-[-0.015em]">
        Already verified.
      </h1>
      <p className="mt-1.5 text-[13px] text-[hsl(var(--muted-foreground))]">
        This address is already confirmed — nothing else to do.
      </p>

      <Button asChild size="lg" className="mt-6 w-full">
        <Link href={signedIn ? "/pos" : "/login"}>
          {signedIn ? "Back to POS" : "Sign in"}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

function ExpiredView({
  signedIn,
  onResend,
  resending,
  resentMsg,
}: {
  signedIn: boolean;
  onResend: () => void;
  resending: boolean;
  resentMsg: string | null;
}) {
  return (
    <div className="grid place-items-center text-center">
      <IconBadge tone="danger">
        <AlertCircle className="size-5" />
      </IconBadge>
      <h1 className="font-display text-[22px] leading-tight tracking-[-0.015em]">
        Link expired.
      </h1>
      <p className="mt-1.5 text-[13px] text-[hsl(var(--muted-foreground))]">
        Verification links are good for 24 hours. Send a fresh one — it&apos;ll
        be in your inbox in a moment.
      </p>

      {resentMsg ? (
        <div className="mt-4 w-full rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2.5 text-[12.5px] text-[hsl(var(--muted-foreground))]">
          {resentMsg}
        </div>
      ) : null}

      {signedIn ? (
        <Button
          type="button"
          size="lg"
          className="mt-6 w-full"
          disabled={resending}
          onClick={onResend}
        >
          {resending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {resending ? "Sending…" : "Send a new link"}
        </Button>
      ) : (
        <Button asChild size="lg" className="mt-6 w-full">
          <Link href="/login">
            Sign in to resend
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}

function ErrorView({
  message,
  signedIn,
  onResend,
  resending,
  resentMsg,
}: {
  message: string | null;
  signedIn: boolean;
  onResend: () => void;
  resending: boolean;
  resentMsg: string | null;
}) {
  return (
    <div className="grid place-items-center text-center">
      <IconBadge tone="danger">
        <AlertCircle className="size-5" />
      </IconBadge>
      <h1 className="font-display text-[22px] leading-tight tracking-[-0.015em]">
        We couldn&apos;t verify that link.
      </h1>
      <p className="mt-1.5 text-[13px] text-[hsl(var(--muted-foreground))]">
        {message ?? "Something went wrong. Please try again."}
      </p>

      {resentMsg ? (
        <div className="mt-4 w-full rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2.5 text-[12.5px] text-[hsl(var(--muted-foreground))]">
          {resentMsg}
        </div>
      ) : null}

      {signedIn ? (
        <Button
          type="button"
          size="lg"
          className="mt-6 w-full"
          disabled={resending}
          onClick={onResend}
        >
          {resending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {resending ? "Sending…" : "Send a new link"}
        </Button>
      ) : (
        <Button asChild size="lg" className="mt-6 w-full" variant="outline">
          <Link href="/login">Back to sign in</Link>
        </Button>
      )}
    </div>
  );
}
