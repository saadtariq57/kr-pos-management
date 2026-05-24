"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer relative grid size-[16px] shrink-0 place-items-center rounded-[4px]",
      "border border-[hsl(var(--border-strong))] bg-[hsl(var(--background))]",
      "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]",
      "transition-[background-color,border-color,box-shadow] duration-150",
      "hover:border-[hsl(var(--ring)/0.4)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
      "data-[state=checked]:bg-[hsl(var(--primary))] data-[state=checked]:border-[hsl(var(--primary))]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-[hsl(var(--primary-foreground))]">
      <Check className="size-3 stroke-[3]" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
