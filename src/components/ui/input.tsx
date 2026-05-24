import * as React from "react";

import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input">;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-9 w-full rounded-[10px] border border-[hsl(var(--input))]",
          "bg-[hsl(var(--background))] px-3 py-1.5 text-[13px] leading-normal",
          "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)]",
          "transition-[border-color,box-shadow,background-color] duration-150",
          "placeholder:text-[hsl(var(--muted-foreground)/0.85)]",
          "hover:border-[hsl(var(--border-strong))]",
          "focus-visible:outline-none focus-visible:border-[hsl(var(--ring)/0.6)] focus-visible:shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03),0_0_0_3px_hsl(var(--ring)/0.18)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:mr-3 file:border-0 file:bg-transparent file:text-[12px] file:font-medium file:text-[hsl(var(--muted-foreground))]",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

type TextareaProps = React.ComponentProps<"textarea">;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex w-full rounded-[10px] border border-[hsl(var(--input))]",
          "bg-[hsl(var(--background))] px-3 py-2 text-[13px] leading-relaxed",
          "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)]",
          "transition-[border-color,box-shadow,background-color] duration-150",
          "placeholder:text-[hsl(var(--muted-foreground)/0.85)]",
          "hover:border-[hsl(var(--border-strong))]",
          "focus-visible:outline-none focus-visible:border-[hsl(var(--ring)/0.6)] focus-visible:shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03),0_0_0_3px_hsl(var(--ring)/0.18)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "min-h-[88px] resize-y",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Input, Textarea };
