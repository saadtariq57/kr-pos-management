"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Building2, LogOut, User } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { isAdmin } from "@/lib/rbac";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

export function AccountCircle() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          "rounded-full outline-none transition-shadow",
          "focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
        )}
        aria-label="Account menu"
      >
        <Avatar className="size-8 transition-colors hover:border-[hsl(var(--border-strong))]">
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={10}
          align="end"
          className={cn(
            "z-50 min-w-[240px] rounded-[12px] border border-[hsl(var(--border-strong))]",
            "bg-[hsl(var(--popover))] p-1.5 text-[hsl(var(--popover-foreground))]",
            "shadow-[0_24px_60px_-24px_hsl(0_0%_0%/0.85)]",
            "origin-top-right transition-[opacity,transform] duration-150",
            "data-[state=open]:opacity-100 data-[state=closed]:opacity-0",
            "data-[state=open]:scale-100 data-[state=closed]:scale-[0.97]",
          )}
        >
          <div className="px-2.5 py-2">
            <div className="text-[13px] font-semibold tracking-[-0.005em]">
              {user.name}
            </div>
            <div className="truncate text-[12px] text-[hsl(var(--muted-foreground))]">
              {user.email}
            </div>
            <div className="text-eyebrow mt-1.5">{user.role}</div>
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-[hsl(var(--border))]" />

          <div className="px-2.5 py-1.5">
            <div className="text-eyebrow mb-1">Branch</div>
            <div className="flex items-start gap-1.5">
              <Building2 className="mt-0.5 size-[13px] shrink-0 text-[hsl(var(--muted-foreground))]" />
              <div className="min-w-0">
                {user.branch ? (
                  <>
                    <div className="truncate text-[12.5px] font-medium tracking-[-0.005em]">
                      {user.branch.name}
                    </div>
                    <div className="truncate text-[11.5px] text-[hsl(var(--muted-foreground))]">
                      {user.branch.city}
                    </div>
                  </>
                ) : (
                  <div className="text-[12.5px] text-[hsl(var(--muted-foreground))]">
                    {isAdmin(user.role) ? "All branches" : "Not assigned"}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-[hsl(var(--border))]" />

          <DropdownMenu.Item
            className={cn(
              "flex cursor-pointer select-none items-center gap-2 rounded-[8px] px-2 py-1.5 text-[13px]",
              "outline-none data-[highlighted]:bg-[hsl(var(--accent))]",
            )}
          >
            <User className="size-[15px] text-[hsl(var(--muted-foreground))]" />
            Account
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className={cn(
              "flex cursor-pointer select-none items-center gap-2 rounded-[8px] px-2 py-1.5 text-[13px]",
              "text-[hsl(var(--destructive))]",
              "outline-none data-[highlighted]:bg-[hsl(var(--destructive)/0.12)]",
            )}
            onSelect={async (e) => {
              e.preventDefault();
              await logout();
            }}
          >
            <LogOut className="size-[15px]" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
