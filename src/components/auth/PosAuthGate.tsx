"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ShieldOff } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export function PosAuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[hsl(var(--background))] px-4">
        <div className="grid w-full max-w-sm gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[hsl(var(--background))] px-4">
        <p className="max-w-sm text-center text-[13px] text-[hsl(var(--muted-foreground))]">
          Redirecting to sign in…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export function AccessDenied({
  title = "Access denied",
  description = "You do not have permission to view this page.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      icon={<ShieldOff className="size-4" />}
      title={title}
      description={description}
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/pos">Back to POS</Link>
        </Button>
      }
      className="py-16"
    />
  );
}
