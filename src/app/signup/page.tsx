"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";

import { AuthFormCard } from "@/components/auth/AuthFormCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { apiGet, apiPost } from "@/lib/api-client";
import {
  SIGNUP_ROLES,
  roleRequiresBranch,
  type SignupRole,
} from "@/lib/rbac";

type SignupResponse = {
  ok: true;
  message?: string;
  email_verification?: {
    sent: boolean;
    skipped: boolean;
    error?: string;
  };
};

type BranchOption = { _id: string; name: string; city: string };

export default function SignupPage() {
  const [showPassword, setShowPassword] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<SignupRole | "">("");
  const [branchId, setBranchId] = React.useState("");
  const [branches, setBranches] = React.useState<BranchOption[]>([]);
  const [branchesLoading, setBranchesLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const router = useRouter();
  const { refresh } = useAuth();
  const { toast } = useToast();

  const needsBranch = !!role && roleRequiresBranch(role);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<{ items: BranchOption[] }>("/api/branches");
        if (!cancelled) setBranches(res.items ?? []);
      } catch {
        if (!cancelled) setBranches([]);
      } finally {
        if (!cancelled) setBranchesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!role) {
      setError("Please select a role.");
      return;
    }
    if (needsBranch && !branchId) {
      setError("Please select a branch for this role.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiPost<SignupResponse>("/api/auth/signup", {
        name,
        email,
        phone,
        password,
        role,
        branch_id: needsBranch ? branchId : null,
      });

      await refresh();

      const verification = res.email_verification;
      if (verification?.sent) {
        toast({
          tone: "success",
          title: "Check your inbox",
          description: `We sent a verification link to ${email}.`,
        });
      } else if (verification?.skipped) {
        toast({
          tone: "info",
          title: "Account created",
          description: "Email service is not configured — verification skipped.",
        });
      } else {
        toast({
          tone: "info",
          title: "Account created",
          description:
            verification?.error ??
            "We could not send the verification email. You can resend it from the app.",
        });
      }

      router.push("/pos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFormCard eyebrow="Create account">
      <div className="mb-6">
        <h1 className="font-display text-[22px] leading-tight tracking-[-0.015em]">
          Create your account.
        </h1>
        <p className="mt-1.5 text-[13px] text-[hsl(var(--muted-foreground))]">
          Pick a role and we&apos;ll create your account. New staff accounts
          stay locked until an admin approves them from the Users page.
        </p>
      </div>

      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-1.5">
          <Label htmlFor="role">Role</Label>
          <Select
            value={role}
            onValueChange={(v) => {
              setRole(v as SignupRole);
              if (!roleRequiresBranch(v)) setBranchId("");
            }}
          >
            <SelectTrigger id="role">
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              {SIGNUP_ROLES.map((r) => (
                <SelectItem key={r} value={r} className="capitalize">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {needsBranch ? (
          <div className="grid gap-1.5">
            <Label htmlFor="branch">Branch</Label>
            <Select
              value={branchId}
              onValueChange={setBranchId}
              disabled={branchesLoading || branches.length === 0}
            >
              <SelectTrigger id="branch">
                <SelectValue
                  placeholder={
                    branchesLoading
                      ? "Loading branches…"
                      : branches.length === 0
                        ? "No active branches available"
                        : "Select your branch"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.name} — {b.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!branchesLoading && branches.length === 0 ? (
              <p className="text-[11.5px] text-[hsl(var(--muted-foreground))]">
                No active branches yet. Ask an admin to create one before
                signing up as a non-admin role.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

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
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+92 300 1234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
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

        <label className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
          <Checkbox id="agree" className="mt-0.5" />
          <span>
            I agree to the terms and want to create a KR Restaurant workspace.
          </span>
        </label>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Creating…" : "Create account"}
          {!submitting ? <ArrowRight className="size-4" /> : null}
        </Button>

        <div className="text-center text-[12.5px] text-[hsl(var(--muted-foreground))]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[hsl(var(--primary))] hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </form>
    </AuthFormCard>
  );
}
