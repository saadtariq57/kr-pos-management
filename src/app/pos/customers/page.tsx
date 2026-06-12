"use client";

import * as React from "react";
import { AlertCircle, Users } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { PageHeader } from "@/components/pages/PageHeader";
import { SlimTable } from "@/components/pages/SlimTable";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiDelete, apiPatch, apiPost } from "@/lib/api-client";
import { useApiList } from "@/lib/useApiList";
import { isValidPhone, PHONE_HINT } from "@/lib/validation";

type CustomerRow = {
  _id: string;
  name: string;
  phone: string;
  email?: string | null;
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
  const confirm = useConfirm();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const [editing, setEditing] = React.useState<CustomerRow | null>(null);

  async function onCreate() {
    setFormError(null);
    if (!name.trim() || !phone.trim()) {
      setFormError("Name and phone are required.");
      return;
    }
    if (!isValidPhone(phone)) {
      setFormError(PHONE_HINT);
      return;
    }
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

  async function onDelete(customer: CustomerRow) {
    const ok = await confirm({
      title: `Delete "${customer.name}"?`,
      description: "This customer will be permanently removed.",
      destructive: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await apiDelete(`/api/customers/${customer._id}`);
      await reload();
      toast({ title: "Customer deleted" });
    } catch (e) {
      toast({
        title: "Could not delete customer",
        description: e instanceof Error ? e.message : undefined,
        tone: "danger",
      });
    }
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Customers"
        title="Customer directory"
        description="Add walk-ins and recurring guests, and keep their contact details up to date."
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
                inputMode="tel"
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

          {formError ? (
            <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{formError}</span>
            </div>
          ) : null}

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
                  key: "actions",
                  header: "",
                  align: "right",
                  cell: (r) => (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(r)}
                      >
                        Edit
                      </Button>
                      {isAdmin ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                          onClick={() => void onDelete(r)}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  ),
                },
              ]}
              rows={data?.items ?? []}
            />
          )}
        </CardContent>
      </Card>

      <EditCustomerDialog
        customer={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSaved={async () => {
          setEditing(null);
          await reload();
        }}
      />
    </div>
  );
}

function EditCustomerDialog({
  customer,
  onOpenChange,
  onSaved,
}: {
  customer: CustomerRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone);
      setEmail(customer.email ?? "");
      setError(null);
    }
  }, [customer]);

  async function save() {
    if (!customer) return;
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError(PHONE_HINT);
      return;
    }
    setSaving(true);
    try {
      await apiPatch(`/api/customers/${customer._id}`, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() ? email.trim() : null,
      });
      toast({ title: "Customer updated", tone: "success" });
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update customer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!customer} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit customer</DialogTitle>
          <DialogDescription>
            Update the customer&apos;s name, phone, or email.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-c-name">Name</Label>
            <Input
              id="edit-c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer name"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-c-phone">Phone</Label>
            <Input
              id="edit-c-phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="03xx-xxxxxxx"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-c-email">Email (optional)</Label>
            <Input
              id="edit-c-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
            />
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm" disabled={saving}>
              Cancel
            </Button>
          </DialogClose>
          <Button size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
