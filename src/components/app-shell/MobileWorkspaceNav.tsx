"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Menu } from "lucide-react";

import { activeNavKey } from "@/components/app-shell/nav";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useVisibleAppNav } from "@/hooks/use-visible-app-nav";
import { cn } from "@/lib/utils";

export function MobileWorkspaceNav() {
  const pathname = usePathname();
  const visibleNav = useVisibleAppNav();
  const activeKey = activeNavKey(pathname, visibleNav);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="shrink-0 lg:hidden">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Open navigation menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "left-0 top-0 w-[min(100vw-2.5rem,18rem)]",
            "h-dvh max-h-none translate-x-0 translate-y-0 rounded-none",
            "border-y-0 border-l-0 border-r border-[hsl(var(--border-strong))] p-0",
          )}
        >
          <DialogTitle className="sr-only">Workspace navigation</DialogTitle>
          <div className="px-5 py-5">
            <BrandMark />
          </div>
          <Separator />
          <nav className="px-3 py-3" aria-label="Workspace navigation">
            <div className="text-eyebrow px-2 pb-2">Workspace</div>
            <ul className="grid gap-0.5">
              {visibleNav.map((item) => {
                const active = item.key === activeKey;
                const Icon = item.icon;
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-[10px] px-2.5 py-2",
                        "text-[13px] text-[hsl(var(--muted-foreground))]",
                        "transition-colors duration-150",
                        active
                          ? "bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
                          : "hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]",
                      )}
                    >
                      <Icon className="size-[15px] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </DialogContent>
      </Dialog>
    </div>
  );
}
