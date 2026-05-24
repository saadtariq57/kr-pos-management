"use client";

import * as React from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { AccessDenied } from "@/components/auth/PosAuthGate";
import { Skeleton } from "@/components/ui/skeleton";

export function RequireRole({
  allow,
  children,
}: {
  allow: (role: string) => boolean;
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid gap-3 py-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!user || !allow(user.role)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
