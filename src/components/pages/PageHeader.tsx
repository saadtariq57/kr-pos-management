"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  right,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <div className="text-eyebrow">{eyebrow}</div> : null}
        <h1
          className={cn(
            "mt-2 font-display text-[28px] leading-[1.1] tracking-[-0.02em] text-[hsl(var(--foreground))]",
            "sm:text-[32px]",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-[60ch] text-[13.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
        ) : null}
      </div>
      {right ? (
        <div className="flex flex-wrap items-center gap-2">{right}</div>
      ) : null}
    </header>
  );
}
