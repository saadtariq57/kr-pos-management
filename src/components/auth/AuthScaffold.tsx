"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

export function AuthScaffold({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "relative min-h-dvh overflow-x-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]",
      )}
    >
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div
          className="absolute -top-1/3 left-1/2 size-[700px] -translate-x-1/2 rounded-full opacity-[0.55] blur-[120px]"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.18), transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.25] grain"
        />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-6 py-6 sm:px-10">
          <Link
            href="/"
            className={cn(
              "inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[hsl(var(--muted-foreground))]",
              "transition-colors hover:text-[hsl(var(--foreground))]",
            )}
          >
            <ArrowLeft className="size-3.5" />
            Back
          </Link>
          <span className="text-eyebrow">Secure</span>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16 sm:px-10">
          {children}
          <p className="mt-10 max-w-[42ch] text-center text-[12px] leading-relaxed text-[hsl(var(--muted-foreground))]">
            By continuing, you agree to KR Restaurant&apos;s terms and acknowledge
            our privacy policy.
          </p>
        </main>
      </div>
    </div>
  );
}
