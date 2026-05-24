"use client";

import * as React from "react";
import {
  Bookmark,
  Boxes,
  ChartNoAxesColumn,
  ClipboardList,
  ScrollText,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/pages/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiList } from "@/lib/useApiList";

export default function ReportsPage() {
  const sales = useApiList<unknown>("/api/sales-summary?limit=7");
  const employees = useApiList<unknown>("/api/employees?limit=1");
  const attendance = useApiList<unknown>("/api/attendance?limit=1");
  const payroll = useApiList<unknown>("/api/payroll?limit=1");
  const reservations = useApiList<unknown>("/api/reservations?limit=1");
  const logs = useApiList<unknown>("/api/analytics-logs?limit=1");

  const stats = [
    {
      icon: <ChartNoAxesColumn className="size-3.5" />,
      label: "Sales summaries",
      value: sales.data?.total,
      loading: sales.loading,
    },
    {
      icon: <Users className="size-3.5" />,
      label: "Employees",
      value: employees.data?.total,
      loading: employees.loading,
    },
    {
      icon: <ClipboardList className="size-3.5" />,
      label: "Attendance records",
      value: attendance.data?.total,
      loading: attendance.loading,
    },
    {
      icon: <Boxes className="size-3.5" />,
      label: "Payroll records",
      value: payroll.data?.total,
      loading: payroll.loading,
    },
    {
      icon: <Bookmark className="size-3.5" />,
      label: "Reservations",
      value: reservations.data?.total,
      loading: reservations.loading,
    },
    {
      icon: <ScrollText className="size-3.5" />,
      label: "Analytics logs",
      value: logs.data?.total,
      loading: logs.loading,
    },
  ];

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Reports"
        title="At a glance"
        description="A quiet pulse on sales, HR, reservations and analytics. Click through for detail when you need it."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="grid gap-2">
              <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                <span className="grid size-6 place-items-center rounded-[6px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
                  {s.icon}
                </span>
                <span className="text-eyebrow">{s.label}</span>
              </div>
              {s.loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="font-display text-[32px] leading-none tracking-[-0.02em]">
                  {(s.value ?? 0).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
