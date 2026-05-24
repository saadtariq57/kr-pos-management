import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { OrderDetailClient } from "./OrderDetailClient";

function Fallback() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <OrderDetailClient />
    </Suspense>
  );
}
