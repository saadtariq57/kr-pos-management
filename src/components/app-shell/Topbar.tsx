"use client";

import Link from "next/link";
import { Building2, Search } from "lucide-react";

import { AccountCircle } from "@/components/auth/AccountCircle";
import { useAuth } from "@/components/auth/AuthProvider";
import { MobileWorkspaceNav } from "@/components/app-shell/MobileWorkspaceNav";
import { NotificationBell } from "@/components/app-shell/NotificationBell";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isAdmin } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { user, loading } = useAuth();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-[hsl(var(--border))]",
        "bg-[hsl(var(--background)/0.78)] backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
        <MobileWorkspaceNav />

        <div className="flex min-w-0 flex-1 items-center">
          <label
            className={cn(
              "group hidden w-full max-w-[440px] items-center gap-2 rounded-[10px]",
              "border border-[hsl(var(--border))] bg-[hsl(var(--card))]",
              "px-3 py-1.5 transition-colors duration-150",
              "focus-within:border-[hsl(var(--ring)/0.5)] hover:border-[hsl(var(--border-strong))]",
              "md:flex",
            )}
          >
            <Search className="size-3.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
            <input
              aria-label="Search"
              className="min-w-0 flex-1 bg-transparent text-[13px] leading-normal outline-none placeholder:text-[hsl(var(--muted-foreground)/0.85)]"
              placeholder="Search orders, menu, customers…"
            />
            <kbd
              className={cn(
                "hidden shrink-0 rounded-[6px] border border-[hsl(var(--border))]",
                "bg-[hsl(var(--background))] px-1.5 py-[1px]",
                "font-mono text-[10px] font-medium text-[hsl(var(--muted-foreground))] sm:inline-flex",
              )}
            >
              ⌘K
            </kbd>
          </label>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {!loading && !user ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
              >
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/signup">Create account</Link>
              </Button>
            </>
          ) : null}

          {user ? <BranchPill /> : null}

          {user ? <NotificationBell /> : null}

          <AccountCircle />
        </div>
      </div>
    </header>
  );
}

/**
 * Small pill that shows the user's active branch context. Admins are global,
 * so they get an "All branches" label instead of a specific location. Hidden
 * on narrow viewports to keep the topbar legible — the same info is always
 * available inside the account menu.
 */
function BranchPill() {
  const { user } = useAuth();
  if (!user) return null;

  const adminLike = isAdmin(user.role);
  const label = user.branch
    ? `${user.branch.name} · ${user.branch.city}`
    : adminLike
      ? "All branches"
      : "No branch";

  const tooltip = user.branch
    ? `${user.branch.name} — ${user.branch.city}`
    : adminLike
      ? "Admins have access to every branch"
      : "This account is not linked to a branch";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 sm:inline-flex",
            "border-[hsl(var(--border))] bg-[hsl(var(--secondary))]",
            "text-[11.5px] font-medium tracking-[-0.005em] text-[hsl(var(--foreground))]",
            "max-w-[180px] truncate",
          )}
        >
          <Building2 className="size-3 shrink-0 text-[hsl(var(--muted-foreground))]" />
          <span className="truncate">{label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
