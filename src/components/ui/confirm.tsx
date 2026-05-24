"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmContextValue = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider />");
  return ctx;
}

type PendingState = ConfirmOptions & {
  resolve: (v: boolean) => void;
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<PendingState | null>(null);

  const confirm = React.useCallback<ConfirmContextValue>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (!open && pending) {
      pending.resolve(false);
      setPending(null);
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!pending} onOpenChange={handleOpenChange}>
        {pending ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{pending.title}</DialogTitle>
              {pending.description ? (
                <DialogDescription>{pending.description}</DialogDescription>
              ) : null}
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  pending.resolve(false);
                  setPending(null);
                }}
              >
                {pending.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                variant={pending.destructive ? "destructive" : "default"}
                size="sm"
                onClick={() => {
                  pending.resolve(true);
                  setPending(null);
                }}
                autoFocus
              >
                {pending.confirmLabel ?? "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </ConfirmContext.Provider>
  );
}
