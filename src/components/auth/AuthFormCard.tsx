"use client";

import * as React from "react";

import { BrandMark } from "@/components/brand/BrandMark";
import { cn } from "@/lib/utils";

type AuthFormCardProps = {
  children: React.ReactNode;
  className?: string;
  eyebrow?: string;
};

export function AuthFormCard({
  children,
  className,
  eyebrow = "Welcome",
}: AuthFormCardProps) {
  return (
    <div
      className={cn(
        "w-full max-w-[420px] animate-kr-fade-in",
        className,
      )}
    >
      <div className="mb-6 flex flex-col items-center gap-4 text-center">
        <BrandMark showCaption={false} />
        <div className="text-eyebrow">{eyebrow}</div>
      </div>

      <div
        className={cn(
          "rounded-[16px] border border-[hsl(var(--border))]",
          "bg-[hsl(var(--card))]",
          "shadow-[0_30px_60px_-30px_hsl(0_0%_0%/0.8)]",
          "p-7 sm:p-8",
        )}
      >
        {children}
      </div>
    </div>
  );
}
