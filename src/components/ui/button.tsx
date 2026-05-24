import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-[10px] text-[13px] font-medium tracking-[-0.005em]",
    "transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.55)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-[15px] [&_svg]:shrink-0",
    "active:translate-y-[0.5px]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
          "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.18),0_1px_0_0_hsl(0_0%_0%/0.6)]",
          "hover:bg-[hsl(var(--primary)/0.94)]",
        ].join(" "),
        secondary: [
          "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]",
          "border border-[hsl(var(--border))]",
          "hover:bg-[hsl(var(--accent))] hover:border-[hsl(var(--border-strong))]",
        ].join(" "),
        ghost:
          "bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
        outline: [
          "border border-[hsl(var(--border))] bg-transparent",
          "text-[hsl(var(--foreground))]",
          "hover:bg-[hsl(var(--accent))] hover:border-[hsl(var(--border-strong))]",
        ].join(" "),
        destructive: [
          "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]",
          "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.14)]",
          "hover:bg-[hsl(var(--destructive)/0.92)]",
        ].join(" "),
        soft: [
          "bg-[hsl(var(--primary)/0.10)] text-[hsl(var(--primary))]",
          "border border-[hsl(var(--primary)/0.20)]",
          "hover:bg-[hsl(var(--primary)/0.14)]",
        ].join(" "),
        link: "h-auto px-0 text-[hsl(var(--primary))] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 rounded-[8px] px-2.5 text-[12.5px]",
        lg: "h-10 px-4 text-[14px]",
        xl: "h-11 px-5 text-[14px]",
        icon: "size-9 p-0",
        "icon-sm": "size-8 p-0 rounded-[8px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
