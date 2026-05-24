"use client";

import * as React from "react";
import { Users } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { PageHeader } from "@/components/pages/PageHeader";
import { SlimTable } from "@/components/pages/SlimTable";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiPatch, apiPost } from "@/lib/api-client";
import { APP_ROLES, roleRequiresBranch } from "@/lib/rbac";
import { useApiList } from "@/lib/useApiList";

type UserRow = {
  _id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  approval_status?: "pending" | "approved";
  email_verified?: boolean;
};
type BranchRow = { _id: string; name: string; city: string };

const ROLE_OPTIONS = APP_ROLES.filter((r) => r !== "hr");

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

const ROLE_BADGE: Record<string, React.ComponentProps<typeof Badge>["variant"]> = {
  admin: "primary",
  manager: "warning",
  cashier: "success",
  waiter: "outline",
  chef: "muted",
  hr: "muted",
};

function roleVariant(
  role: string,
): React.ComponentProps<typeof Badge>["variant"] {
  return ROLE_BADGE[role.toLowerCase()] ?? "muted";
}

export default function UsersAndRolesPage() {
  const { user: currentUser } = useAuth();
  const users = useApiList<UserRow>("/api/users?limit=30");
  const branches = useApiList<BranchRow>("/api/branches");
  const { toast } = useToast();

  const [role, setRole] = React.useState<string>("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const needsBranch = !!role && roleRequiresBranch(role);
  const isLoginRole = !!role && role !== "waiter";

  // Password-confirm dialog for hard delete — same UX as Branches and the
  // Employees directory. The DELETE endpoint enforces FK safety and falls back
  // with a 409 when historical orders/payroll reference the user.
  const [pendingDelete, setPendingDelete] = React.useState<UserRow | null>(null);
  const [adminPassword, setAdminPassword] = React.useState("");
  const [dialogSubmitting, setDialogSubmitting] = React.useState(false);
  const [dialogError, setDialogError] = React.useState<string | null>(null);

  // Track in-flight approvals so the row's button shows a spinner instead
  // of the whole table going into a loading state.
  const [approving, setApproving] = React.useState<Record<string, boolean>>({});

  async function approveUser(row: UserRow) {
    setApproving((s) => ({ ...s, [row._id]: true }));
    try {
      await apiPatch(`/api/users/${row._id}`, { approval_status: "approved" });
      await users.reload();
      toast({ title: `${row.name} approved`, tone: "success" });
    } catch (e) {
      toast({
        title: "Could not approve user",
        description: e instanceof Error ? e.message : undefined,
        tone: "danger",
      });
    } finally {
      setApproving((s) => {
        const next = { ...s };
        delete next[row._id];
        return next;
      });
    }
  }

  async function createUser() {
    if (!role) {
      toast({ title: "Select a role first", tone: "danger" });
      return;
    }
    if (!name.trim() || !phone.trim()) {
      toast({ title: "Name and phone are required", tone: "danger" });
      return;
    }
    if (isLoginRole && (!email.trim() || !password)) {
      toast({ title: "Email and password are required", tone: "danger" });
      return;
    }
    if (needsBranch && !branchId) {
      toast({ title: "Select a branch for this role", tone: "danger" });
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/api/users", {
        name,
        phone,
        role,
        branch_id: needsBranch ? branchId : null,
        ...(isLoginRole ? { email, password } : {}),
      });
      setRole("");
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setBranchId("");
      await users.reload();
      toast({ title: "User created", tone: "success" });
    } catch (e) {
      toast({
        title: "Could not create user",
        description: e instanceof Error ? e.message : undefined,
        tone: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function openDeleteDialog(row: UserRow) {
    if (row._id === currentUser?.id) {
      toast({ title: "You cannot delete your own account", tone: "danger" });
      return;
    }
    setPendingDelete(row);
    setAdminPassword("");
    setDialogError(null);
  }

  function handleRoleChange(nextRole: string) {
    setRole(nextRole);
    if (!roleRequiresBranch(nextRole)) setBranchId("");
    if (nextRole === "waiter") {
      setEmail("");
      setPassword("");
    }
  }

  function closeDeleteDialog() {
    setPendingDelete(null);
    setAdminPassword("");
    setDialogError(null);
    setDialogSubmitting(false);
  }

  async function submitDelete() {
    if (!pendingDelete) return;
    if (!adminPassword) {
      setDialogError("Enter your admin password to confirm.");
      return;
    }
    setDialogSubmitting(true);
    setDialogError(null);
    try {
      const res = await fetch(`/api/users/${pendingDelete._id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: adminPassword }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? `Request failed (${res.status})`);
      }
      toast({ title: "User deleted", tone: "success" });
      closeDeleteDialog();
      await users.reload();
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDialogSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Users"
        title="Team accounts"
        description="Create staff accounts and manage access to the workspace."
      />

      <div className="grid gap-6">
        <Card>
          <CardContent className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[14px] font-semibold tracking-[-0.005em]">
                  Users
                </div>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                  Add staff accounts to the workspace.
                </p>
              </div>
              <Button
                size="sm"
                disabled={submitting || !role}
                onClick={() => void createUser()}
              >
                {submitting ? "Adding…" : "Add user"}
              </Button>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role to begin" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {role ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label>Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      autoComplete="tel"
                      placeholder="+92 300 1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  {isLoginRole ? (
                    <>
                      <div className="grid gap-1.5">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Password</Label>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                    </>
                  ) : null}

                  {needsBranch ? (
                    <div className="grid gap-1.5 sm:col-span-2">
                      <Label>Branch</Label>
                      <Select
                        value={branchId}
                        onValueChange={setBranchId}
                        disabled={
                          branches.loading ||
                          (branches.data?.items ?? []).length === 0
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              branches.loading
                                ? "Loading branches…"
                                : (branches.data?.items ?? []).length === 0
                                  ? "No active branches available"
                                  : "Select branch"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {(branches.data?.items ?? []).map((b) => (
                            <SelectItem key={b._id} value={b._id}>
                              {b.name} — {b.city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {users.loading && !users.data ? (
              <Skeleton className="h-40 w-full" />
            ) : (users.data?.items ?? []).length === 0 ? (
              <EmptyState
                icon={<Users className="size-4" />}
                title="No users yet"
                description="Add your first user using the form above."
              />
            ) : (
              <SlimTable<UserRow>
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
                    key: "contact",
                    header: "Contact",
                    cell: (r) => (
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {r.email || r.phone || "—"}
                      </span>
                    ),
                  },
                  {
                    key: "role",
                    header: "Role",
                    cell: (r) => (
                      <Badge variant={roleVariant(r.role)} dot className="capitalize">
                        {r.role}
                      </Badge>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    cell: (r) => {
                      const isPending = r.approval_status === "pending";
                      return (
                        <Badge
                          variant={isPending ? "warning" : "success"}
                          dot
                          className="capitalize"
                        >
                          {isPending ? "Pending" : "Approved"}
                        </Badge>
                      );
                    },
                  },
                  {
                    key: "actions",
                    header: "",
                    align: "right",
                    cell: (r) => {
                      const isSelf = r._id === currentUser?.id;
                      const isPending = r.approval_status === "pending";
                      const isApproving = !!approving[r._id];
                      return (
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isApproving}
                              onClick={() => void approveUser(r)}
                            >
                              {isApproving ? "Approving…" : "Approve"}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isSelf}
                            className="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                            title={
                              isSelf
                                ? "You cannot delete your own account"
                                : "Delete user"
                            }
                            onClick={() => openDeleteDialog(r)}
                          >
                            Delete
                          </Button>
                        </div>
                      );
                    },
                  },
                ]}
                rows={users.data?.items ?? []}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
      >
        {pendingDelete ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{`Delete "${pendingDelete.name}"?`}</DialogTitle>
              <DialogDescription>
                This user will be permanently removed. The action is blocked if
                the account has historical orders or HR records — deactivate
                them instead in those cases.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              <Label htmlFor="users-admin-password">
                Confirm with your admin password
              </Label>
              <Input
                id="users-admin-password"
                type="password"
                autoComplete="current-password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitDelete();
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
                onClick={closeDeleteDialog}
                disabled={dialogSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void submitDelete()}
                disabled={dialogSubmitting}
                autoFocus
              >
                {dialogSubmitting ? "Deleting…" : "Delete user"}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
