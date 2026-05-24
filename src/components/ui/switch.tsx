"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-[20px] w-[34px] shrink-0 cursor-pointer items-center rounded-full border border-transparent",
      "shadow-[inset_0_1px_2px_hsl(0_0%_0%/0.4)]",
      "transition-colors duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:bg-[hsl(var(--primary))] data-[state=unchecked]:bg-[hsl(var(--muted))]",
      className,
    )}
    {...props}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block size-[14px] rounded-full bg-[hsl(0_0%_98%)] shadow-[0_1px_2px_hsl(0_0%_0%/0.4)] ring-0",
        "transition-transform duration-200 ease-out",
        "data-[state=checked]:translate-x-[16px] data-[state=unchecked]:translate-x-[2px]",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
