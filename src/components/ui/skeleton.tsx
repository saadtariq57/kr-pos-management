import * as React from "react";

import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[8px] bg-[hsl(var(--muted))]",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:bg-[linear-gradient(90deg,transparent,hsl(var(--foreground)/0.05),transparent)]",
        "before:animate-[shimmer_1.8s_infinite_ease-in-out]",
        className,
      )}
      {...props}
    />
  );
}
