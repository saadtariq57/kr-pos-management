"use client";

import * as React from "react";
import { AlertCircle, Users } from "lucide-react";

import { PageHeader } from "@/components/pages/PageHeader";
import { SlimTable } from "@/components/pages/SlimTable";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiPost } from "@/lib/api-client";
import { useApiList } from "@/lib/useApiList";

type CustomerRow = {
  _id: string;
  name: string;
  phone: string;
  email?: string | null;
  loyalty_points?: number;
  created_at?: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

export default function CustomersPage() {
  const { data, error, loading, reload } =
    useApiList<CustomerRow>("/api/customers?limit=25");
  const { toast } = useToast();

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function onCreate() {
    if (!name.trim() || !phone.trim()) return;
    setSubmitting(true);
    try {
      await apiPost("/api/customers", {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() ? email.trim() : null,
      });
      setName("");
      setPhone("");
      setEmail("");
      await reload();
      toast({ title: "Customer added", tone: "success" });
    } catch (e) {
      toast({
        title: "Could not add customer",
        description: e instanceof Error ? e.message : undefined,
        tone: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Customers"
        title="Customer directory"
        description="Add walk-ins and recurring guests, and track loyalty in one place."
        right={
          <Button size="sm" onClick={() => void onCreate()} disabled={submitting}>
            {submitting ? "Adding…" : "Add customer"}
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="c-name">Name</Label>
              <Input
                id="c-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer name"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-phone">Phone</Label>
              <Input
                id="c-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03xx-xxxxxxx"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-email">Email (optional)</Label>
              <Input
                id="c-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
              />
            </div>
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {loading && !data ? (
            <Skeleton className="h-40 w-full" />
          ) : (data?.items ?? []).length === 0 ? (
            <EmptyState
              icon={<Users className="size-4" />}
              title="No customers yet"
              description="Add your first customer using the form above."
            />
          ) : (
            <SlimTable<CustomerRow>
              rowKey={(r) => r._id}
              columns={[
                {
                  key: "name",
                  header: "Name",
                  cell: (r) => (
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-7">
                        <AvatarFallback className="text-[10.5px]">
                          {initials(r.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{r.name}</span>
                    </div>
                  ),
                },
                {
                  key: "phone",
                  header: "Phone",
                  cell: (r) => (
                    <span className="font-mono text-[12px] text-[hsl(var(--muted-foreground))]">
                      {r.phone}
                    </span>
                  ),
                },
                {
                  key: "email",
                  header: "Email",
                  cell: (r) => (
                    <span className="text-[hsl(var(--muted-foreground))]">
                      {r.email ?? "—"}
                    </span>
                  ),
                },
                {
                  key: "points",
                  header: "Loyalty",
                  align: "right",
                  cell: (r) =>
                    (r.loyalty_points ?? 0) > 0 ? (
                      <Badge variant="primary" size="sm">
                        {r.loyalty_points} pts
                      </Badge>
                    ) : (
                      <span className="text-[hsl(var(--muted-foreground))]">—</span>
                    ),
                },
              ]}
              rows={data?.items ?? []}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
