import { Suspense } from "react";

import { AuthFormCard } from "@/components/auth/AuthFormCard";
import { Skeleton } from "@/components/ui/skeleton";

import { LoginClient } from "./LoginClient";

function LoginFallback() {
  return (
    <AuthFormCard eyebrow="Sign in">
      <div className="grid gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-3 h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="mt-2 h-10 w-full" />
      </div>
    </AuthFormCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}
