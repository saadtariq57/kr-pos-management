"use client";

import * as React from "react";

import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { cn } from "@/lib/utils";

import { SidebarNav } from "./SidebarNav";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[hsl(var(--background))]">
      <div className="flex min-h-dvh">
        <SidebarNav />

        <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
          <EmailVerificationBanner />
          <Topbar />

          <main
            className={cn(
              "mx-auto w-full max-w-[1320px] flex-1",
              "px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10",
              "animate-kr-fade-in",
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
