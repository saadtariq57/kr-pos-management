"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, X, AlertCircle, Info } from "lucide-react";

import { ConfirmProvider } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";

type ToastTone = "default" | "success" | "danger" | "info";

type ToastItem = {
  id: string;
  title?: string;
  description?: string;
  tone?: ToastTone;
};

type ToastContextValue = {
  toast: (input: Omit<ToastItem, "id"> | string) => void;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider />");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setItems((curr) => curr.filter((it) => it.id !== id));
  }, []);

  const toast = React.useCallback<ToastContextValue["toast"]>((input) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `t_${Math.random().toString(36).slice(2)}`;
    const normalized: ToastItem =
      typeof input === "string" ? { id, title: input } : { id, ...input };
    setItems((curr) => [...curr, normalized]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      <ConfirmProvider>
        <ToastPrimitive.Provider swipeDirection="right" duration={4500}>
          {children}
          {items.map((it) => (
            <ToastNode
              key={it.id}
              item={it}
              onClose={() => dismiss(it.id)}
            />
          ))}
          <ToastPrimitive.Viewport
            className={cn(
              "fixed bottom-4 right-4 z-[80] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none",
            )}
          />
        </ToastPrimitive.Provider>
      </ConfirmProvider>
    </ToastContext.Provider>
  );
}

function ToastNode({
  item,
  onClose,
}: {
  item: ToastItem;
  onClose: () => void;
}) {
  const Icon =
    item.tone === "success"
      ? CheckCircle2
      : item.tone === "danger"
        ? AlertCircle
        : item.tone === "info"
          ? Info
          : null;

  return (
    <ToastPrimitive.Root
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className={cn(
        "group relative grid grid-cols-[auto_1fr_auto] items-start gap-3",
        "rounded-[12px] border border-[hsl(var(--border-strong))] bg-[hsl(var(--popover))]",
        "p-3.5 pr-2 text-[hsl(var(--popover-foreground))]",
        "shadow-[0_24px_60px_-24px_hsl(0_0%_0%/0.85)]",
        "data-[state=open]:opacity-100 data-[state=closed]:opacity-0",
        "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
        "data-[swipe=cancel]:translate-x-0",
        "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
        "transition-[opacity,transform] duration-200 ease-out",
      )}
    >
      {Icon ? (
        <Icon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            item.tone === "success" && "text-[hsl(var(--success))]",
            item.tone === "danger" && "text-[hsl(var(--destructive))]",
            item.tone === "info" && "text-[hsl(var(--primary))]",
          )}
        />
      ) : (
        <span className="mt-1.5 size-1.5 rounded-full bg-[hsl(var(--muted-foreground))]" />
      )}

      <div className="min-w-0 grid gap-0.5">
        {item.title ? (
          <ToastPrimitive.Title className="text-[13px] font-semibold tracking-tight">
            {item.title}
          </ToastPrimitive.Title>
        ) : null}
        {item.description ? (
          <ToastPrimitive.Description className="text-[12.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
            {item.description}
          </ToastPrimitive.Description>
        ) : null}
      </div>

      <ToastPrimitive.Close
        aria-label="Dismiss"
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-[8px] text-[hsl(var(--muted-foreground))]",
          "hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))] transition-colors",
        )}
      >
        <X className="size-3.5" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}
