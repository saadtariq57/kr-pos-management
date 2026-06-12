"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";

import { AuthFormCard } from "@/components/auth/AuthFormCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api-client";

export function LoginClient() {
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  const justRegistered = searchParams.get("registered") === "1";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost("/api/auth/login", { email, password });
      await refresh();
      router.push("/pos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFormCard eyebrow="Sign in">
      <div className="mb-6">
        <h1 className="font-display text-[22px] leading-tight tracking-[-0.015em]">
          Welcome back.
        </h1>
        <p className="mt-1.5 text-[13px] text-[hsl(var(--muted-foreground))]">
          Sign in to continue to KR Restaurant.
        </p>
      </div>

      {justRegistered ? (
        <div className="mb-5 flex items-start gap-2 rounded-[10px] border border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.08)] px-3 py-2.5 text-[12.5px]">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[hsl(var(--primary))]" />
          <span>Account created. Sign in with your email and password.</span>
        </div>
      ) : null}

      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3">
          <Link
            href="#"
            className="text-[12.5px] font-medium text-[hsl(var(--primary))] hover:opacity-90"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
          {!submitting ? <ArrowRight className="size-4" /> : null}
        </Button>

        <div className="text-center text-[12.5px] text-[hsl(var(--muted-foreground))]">
          New here?{" "}
          <Link
            href="/signup"
            className="font-semibold text-[hsl(var(--primary))] hover:opacity-90"
          >
            Create an account
          </Link>
        </div>
      </form>
    </AuthFormCard>
  );
}
