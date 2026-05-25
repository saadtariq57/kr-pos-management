import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5",
    "text-[10.5px] font-semibold uppercase tracking-[0.14em]",
    "transition-colors",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]",
        muted:
          "border-[hsl(var(--border))] bg-transparent text-[hsl(var(--muted-foreground))]",
        primary:
          "border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.10)] text-[hsl(var(--primary))]",
        success:
          "border-[hsl(var(--success)/0.30)] bg-[hsl(var(--success)/0.10)] text-[hsl(var(--success))]",
        warning:
          "border-[hsl(38_92%_55%/0.32)] bg-[hsl(38_92%_55%/0.10)] text-[hsl(38_92%_62%)]",
        danger:
          "border-[hsl(var(--destructive)/0.32)] bg-[hsl(var(--destructive)/0.10)] text-[hsl(var(--destructive))]",
        outline:
          "border-[hsl(var(--border-strong))] bg-transparent text-[hsl(var(--foreground))]",
      },
      size: {
        default: "h-5",
        sm: "h-[18px] px-1.5 text-[9.5px]",
        lg: "h-6 px-2.5 text-[11px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & { dot?: boolean };

export function Badge({
  className,
  variant,
  size,
  dot,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {dot ? (
        <span
          className={cn(
            "inline-block size-1.5 shrink-0 rounded-full",
            variant === "primary" && "bg-[hsl(var(--primary))]",
            variant === "success" && "bg-[hsl(var(--success))]",
            variant === "warning" && "bg-[hsl(38_92%_60%)]",
            variant === "danger" && "bg-[hsl(var(--destructive))]",
            (!variant || variant === "default" || variant === "muted" || variant === "outline") &&
              "bg-[hsl(var(--muted-foreground))]",
          )}
        />
      ) : null}
      <span className="pl-[0.14em]">{children}</span>
    </span>
  );
}
