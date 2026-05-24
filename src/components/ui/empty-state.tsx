import * as React from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? (
        <div
          className={cn(
            "grid size-10 place-items-center rounded-full",
            "border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]",
            "text-[hsl(var(--muted-foreground))]",
          )}
        >
          {icon}
        </div>
      ) : null}
      <div className="grid gap-1">
        <div className="text-[14px] font-semibold tracking-[-0.005em] text-[hsl(var(--foreground))]">
          {title}
        </div>
        {description ? (
          <p className="mx-auto max-w-[36ch] text-[12.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
