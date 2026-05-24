"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { activeNavKey } from "@/components/app-shell/nav";
import { useAuth } from "@/components/auth/AuthProvider";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useVisibleAppNav } from "@/hooks/use-visible-app-nav";
import { cn } from "@/lib/utils";

export function SidebarNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const visibleNav = useVisibleAppNav();
  const activeKey = activeNavKey(pathname, visibleNav);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh w-[240px] shrink-0 lg:flex lg:flex-col",
        "border-r border-[hsl(var(--border))] bg-[hsl(var(--background))]",
      )}
    >
      <div className="px-5 pb-4 pt-6">
        <BrandMark />
      </div>

      <Separator />

      <nav
        aria-label="Workspace navigation"
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        <div className="text-eyebrow px-2 pb-2">Workspace</div>
        <ul className="grid gap-0.5">
          {visibleNav.map((item) => {
            const active = item.key === activeKey;
            const Icon = item.icon;

            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-[10px] px-2.5 py-2",
                    "text-[13px] text-[hsl(var(--muted-foreground))]",
                    "transition-[color,background-color] duration-150",
                    "hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]",
                    active &&
                      "bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]",
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-[hsl(var(--primary))]"
                    />
                  ) : null}
                  <Icon
                    className={cn(
                      "size-[15px] shrink-0 transition-colors",
                      active
                        ? "text-[hsl(var(--foreground))]"
                        : "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]",
                    )}
                  />
                  <span className="truncate tracking-[-0.005em]">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Separator />

      <div className="px-4 py-4">
        {!loading && !user ? (
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        ) : user ? (
          <div className="grid gap-0.5">
            <div className="text-eyebrow">Signed in</div>
            <div className="truncate text-[13px] font-medium tracking-[-0.005em] text-[hsl(var(--foreground))]">
              {user.name}
            </div>
            <div className="truncate text-[12px] capitalize text-[hsl(var(--muted-foreground))]">
              {user.role}
              {user.branch ? ` · ${user.branch.name}` : null}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
