"use client";

import * as React from "react";
import { Building2, Trash2 } from "lucide-react";

import { RequireRole } from "@/components/auth/RequireRole";
import { PageHeader } from "@/components/pages/PageHeader";
import { SlimTable } from "@/components/pages/SlimTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
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
import { apiPatch, apiPost } from "@/lib/api-client";
import { canManageBranches } from "@/lib/rbac";
import { useApiList } from "@/lib/useApiList";

type BranchRow = {
  _id: string;
  name: string;
  city: string;
  address: string;
  phone?: string;
  is_active: boolean;
  created_at?: string;
  deactivated_at?: string | null;
};

type BranchAction = "activate" | "deactivate" | "delete";

type PendingAction = {
  branch: BranchRow;
  action: BranchAction;
};

export default function BranchesPage() {
  return (
    <RequireRole allow={canManageBranches}>
      <BranchesPageContent />
    </RequireRole>
  );
}

function BranchesPageContent() {
  const branches = useApiList<BranchRow>("/api/branches?all=true&limit=50");
  const { toast } = useToast();

  const [name, setName] = React.useState("");
  const [city, setCity] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  // Single password-confirm dialog drives activate / deactivate / hard-delete
  // so admins always see the same in-app prompt instead of an OS popup.
  const [pending, setPending] = React.useState<PendingAction | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [dialogError, setDialogError] = React.useState<string | null>(null);

  async function createBranch() {
    if (!name.trim() || !city.trim() || !address.trim()) {
      toast({ title: "Name, city and address are required", tone: "danger" });
      return;
    }
    setCreating(true);
    try {
      await apiPost("/api/branches", { name, city, address, phone });
      setName("");
      setCity("");
      setAddress("");
      setPhone("");
      await branches.reload();
      toast({ title: "Branch created", tone: "success" });
    } catch (e) {
      toast({
        title: "Could not create branch",
        description: e instanceof Error ? e.message : undefined,
        tone: "danger",
      });
    } finally {
      setCreating(false);
    }
  }

  function openDialog(branch: BranchRow, action: BranchAction) {
    setPending({ branch, action });
    setPassword("");
    setDialogError(null);
  }

  function closeDialog() {
    setPending(null);
    setPassword("");
    setDialogError(null);
    setSubmitting(false);
  }

  async function submitAction() {
    if (!pending) return;
    if (!password) {
      setDialogError("Enter your admin password to confirm.");
      return;
    }
    setSubmitting(true);
    setDialogError(null);

    try {
      if (pending.action === "delete") {
        const res = await fetch(`/api/branches/${pending.branch._id}`, {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error ?? `Request failed (${res.status})`);
        }
        toast({ title: "Branch deleted", tone: "success" });
      } else {
        const res = await apiPatch<{
          ok: true;
          cascaded_users_deactivated?: number;
        }>(`/api/branches/${pending.branch._id}`, {
          action: pending.action,
          password,
        });
        const cascaded = res.cascaded_users_deactivated ?? 0;
        toast({
          tone: "success",
          title:
            pending.action === "activate"
              ? "Branch activated"
              : "Branch deactivated",
          description:
            pending.action === "deactivate" && cascaded > 0
              ? `${cascaded} user${cascaded === 1 ? "" : "s"} attached to this branch were locked out.`
              : undefined,
        });
      }

      closeDialog();
      await branches.reload();
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setSubmitting(false);
    }
  }

  const rows = branches.data?.items ?? [];

  const dialogCopy = React.useMemo(() => {
    if (!pending) return null;
    switch (pending.action) {
      case "activate":
        return {
          title: `Activate "${pending.branch.name}"?`,
          description:
            "Once active, the branch will be selectable on signup and visible to its staff again. Existing staff accounts remain deactivated until you re-enable them individually from Users.",
          confirmLabel: "Activate branch",
          confirmVariant: "default" as const,
        };
      case "deactivate":
        return {
          title: `Deactivate "${pending.branch.name}"?`,
          description:
            "All non-admin users attached to this branch will be immediately locked out of the app. Orders, payments and HR records are preserved.",
          confirmLabel: "Deactivate branch",
          confirmVariant: "destructive" as const,
        };
      case "delete":
        return {
          title: `Permanently delete "${pending.branch.name}"?`,
          description:
            "This cannot be undone and is only allowed when no users are attached. Use Deactivate instead if the branch ever had staff or orders.",
          confirmLabel: "Delete forever",
          confirmVariant: "destructive" as const,
        };
    }
  }, [pending]);

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Operations"
        title="Branches"
        description="Add new restaurant locations and control which branches can take orders. Deactivating a branch automatically locks out every non-admin user attached to it."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardContent className="grid gap-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[14px] font-semibold tracking-[-0.005em]">
                  New branch
                </div>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                  Branches show up immediately on the signup form.
                </p>
              </div>
              <Button size="sm" disabled={creating} onClick={() => void createBranch()}>
                {creating ? "Adding…" : "Add branch"}
              </Button>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Name</Label>
                <Input
                  placeholder="KR – Lahore Gulberg"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>City</Label>
                <Input
                  placeholder="Lahore"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Address</Label>
                <Input
                  placeholder="MM Alam Road, Block C"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Phone (optional)</Label>
                <Input
                  placeholder="+92…"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-5">
            <div>
              <div className="text-[14px] font-semibold tracking-[-0.005em]">
                All branches
              </div>
              <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                Activating, deactivating, or deleting a branch requires
                re-entering your admin password.
              </p>
            </div>

            {branches.loading && !branches.data ? (
              <Skeleton className="h-40 w-full" />
            ) : rows.length === 0 ? (
              <EmptyState
                icon={<Building2 className="size-4" />}
                title="No branches yet"
                description="Create the first branch using the form on the left."
              />
            ) : (
              <SlimTable<BranchRow>
                rowKey={(r) => r._id}
                columns={[
                  {
                    key: "name",
                    header: "Branch",
                    cell: (r) => (
                      <div className="grid">
                        <span className="font-medium">{r.name}</span>
                        <span className="text-[11.5px] text-[hsl(var(--muted-foreground))]">
                          {r.city}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: "address",
                    header: "Address",
                    cell: (r) => (
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {r.address}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    cell: (r) => (
                      <Badge
                        variant={r.is_active ? "success" : "muted"}
                        dot
                        className="capitalize"
                      >
                        {r.is_active ? "Active" : "Deactivated"}
                      </Badge>
                    ),
                  },
                  {
                    key: "actions",
                    header: "",
                    align: "right",
                    cell: (r) => (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant={r.is_active ? "outline" : "default"}
                          onClick={() =>
                            openDialog(r, r.is_active ? "deactivate" : "activate")
                          }
                        >
                          {r.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                          title="Hard delete (only allowed when no users are attached)"
                          onClick={() => openDialog(r, "delete")}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ),
                  },
                ]}
                rows={rows}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        {pending && dialogCopy ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dialogCopy.title}</DialogTitle>
              <DialogDescription>{dialogCopy.description}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              <Label htmlFor="admin-password">Confirm with your admin password</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitAction();
                }}
              />
              {dialogError ? (
                <p className="text-[12px] text-[hsl(var(--destructive))]">
                  {dialogError}
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={closeDialog}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant={dialogCopy.confirmVariant}
                size="sm"
                onClick={() => void submitAction()}
                disabled={submitting}
                autoFocus
              >
                {submitting ? "Working…" : dialogCopy.confirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
