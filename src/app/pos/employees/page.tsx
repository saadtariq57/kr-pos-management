"use client";

import * as React from "react";
import { Trash2, UserRoundCog, Users as UsersIcon } from "lucide-react";

import { RequireRole } from "@/components/auth/RequireRole";
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
import { apiGet, apiPatch } from "@/lib/api-client";
import { canViewBranchEmployees, isAdmin } from "@/lib/rbac";
import { useApiList } from "@/lib/useApiList";

type EmployeeRow = {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  branch: { id: string; name: string; city: string } | null;
  hr: {
    employee_id: string;
    phone: string;
    designation: string;
    department: string;
    salary: number;
    hire_date: string;
    employment_status: string;
  } | null;
  created_at: string | null;
};

type BranchOption = {
  _id: string;
  name: string;
  city: string;
};

const ROLE_FILTERS_BASE = [
  { value: "all", label: "All roles" },
  { value: "manager", label: "Manager" },
  { value: "cashier", label: "Cashier" },
  { value: "chef", label: "Chef" },
  { value: "waiter", label: "Waiter" },
  { value: "hr", label: "HR" },
] as const;

const ROLE_FILTERS_ADMIN = [
  ...ROLE_FILTERS_BASE,
  { value: "admin", label: "Admin" },
] as const;

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

function roleVariant(
  role: string,
): React.ComponentProps<typeof Badge>["variant"] {
  const r = role.toLowerCase();
  if (r === "admin") return "primary";
  if (r === "manager") return "warning";
  if (r === "chef") return "success";
  return "muted";
}

/**
 * Renders an `Intl.RelativeTimeFormat` string ("3 hours ago") for a given ISO
 * timestamp. Returns "Never" when `iso` is null, which is the common case for
 * accounts that signed up but never completed a login.
 */
function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Never";
  const diffSec = Math.round((then - Date.now()) / 1000);
  const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];

  for (const [unit, secondsInUnit] of ranges) {
    if (Math.abs(diffSec) >= secondsInUnit || unit === "second") {
      return fmt.format(Math.round(diffSec / secondsInUnit), unit);
    }
  }
  return "Just now";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `Rs. ${value}`;
  }
}

export default function EmployeesPage() {
  return (
    <RequireRole allow={canViewBranchEmployees}>
      <EmployeesPageContent />
    </RequireRole>
  );
}

function EmployeesPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const admin = isAdmin(user?.role ?? "");

  const [roleFilter, setRoleFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [branchFilter, setBranchFilter] = React.useState<string>("all");
  const [query, setQuery] = React.useState("");

  // Admin gets the branch filter; managers are pinned server-side to their own
  // branch, so we just hide the dropdown entirely for them.
  const [branches, setBranches] = React.useState<BranchOption[]>([]);
  React.useEffect(() => {
    if (!admin) return;
    let cancelled = false;
    void apiGet<{ items: BranchOption[] }>("/api/branches?all=true&limit=100")
      .then((res) => {
        if (!cancelled) setBranches(res.items ?? []);
      })
      .catch(() => {
        /* Ignore — the filter just stays empty. */
      });
    return () => {
      cancelled = true;
    };
  }, [admin]);

  const listPath = React.useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", "100");
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (admin && branchFilter !== "all") params.set("branch_id", branchFilter);
    return `/api/employees-directory?${params.toString()}`;
  }, [admin, branchFilter, roleFilter, statusFilter]);

  const list = useApiList<EmployeeRow>(listPath);

  // Local text filter (matches name / email / phone / designation / department).
  const filteredRows = React.useMemo(() => {
    const rows = list.data?.items ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        (row.phone ?? "").toLowerCase().includes(q) ||
        (row.hr?.designation ?? "").toLowerCase().includes(q) ||
        (row.hr?.department ?? "").toLowerCase().includes(q)
      );
    });
  }, [list.data?.items, query]);

  // Activate / deactivate flow — admin only, no password required.
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  async function toggleActive(row: EmployeeRow) {
    if (row.user_id === user?.id) {
      toast({
        title: "You cannot change your own active status",
        tone: "danger",
      });
      return;
    }
    setTogglingId(row.user_id);
    try {
      const action = row.is_active ? "deactivate" : "activate";
      await apiPatch(`/api/users/${row.user_id}`, { action });
      toast({
        title: row.is_active ? "Employee deactivated" : "Employee activated",
        tone: "success",
      });
      await list.reload();
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : undefined,
        tone: "danger",
      });
    } finally {
      setTogglingId(null);
    }
  }

  // Hard delete — admin only, password-confirmed, FK-guarded server-side.
  const [pendingDelete, setPendingDelete] = React.useState<EmployeeRow | null>(
    null,
  );
  const [password, setPassword] = React.useState("");
  const [dialogError, setDialogError] = React.useState<string | null>(null);
  const [dialogSubmitting, setDialogSubmitting] = React.useState(false);

  function openDelete(row: EmployeeRow) {
    if (row.user_id === user?.id) {
      toast({ title: "You cannot delete your own account", tone: "danger" });
      return;
    }
    setPendingDelete(row);
    setPassword("");
    setDialogError(null);
  }

  function closeDelete() {
    setPendingDelete(null);
    setPassword("");
    setDialogError(null);
    setDialogSubmitting(false);
  }

  async function submitDelete() {
    if (!pendingDelete) return;
    if (!password) {
      setDialogError("Enter your admin password to confirm.");
      return;
    }
    setDialogSubmitting(true);
    setDialogError(null);
    try {
      const res = await fetch(`/api/users/${pendingDelete.user_id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? `Request failed (${res.status})`);
      }
      toast({ title: "Employee deleted", tone: "success" });
      closeDelete();
      await list.reload();
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDialogSubmitting(false);
    }
  }

  // Per-row expandable HR detail.
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // HR Profile Dialog Form State
  const [editingHrRow, setEditingHrRow] = React.useState<EmployeeRow | null>(null);
  const [hrDesignation, setHrDesignation] = React.useState("");
  const [hrDepartment, setHrDepartment] = React.useState("");
  const [hrPhone, setHrPhone] = React.useState("");
  const [hrSalary, setHrSalary] = React.useState("");
  const [hrHireDate, setHrHireDate] = React.useState("");
  const [hrEmploymentStatus, setHrEmploymentStatus] = React.useState("active");
  const [hrSubmitting, setHrSubmitting] = React.useState(false);
  const [hrDialogError, setHrDialogError] = React.useState<string | null>(null);

  function openHrDialog(row: EmployeeRow) {
    setEditingHrRow(row);
    setHrDesignation(row.hr?.designation ?? "");
    setHrDepartment(row.hr?.department ?? "");
    setHrPhone(row.hr?.phone ?? row.phone ?? "");
    setHrSalary(row.hr?.salary != null ? String(row.hr.salary) : "");
    setHrHireDate(row.hr?.hire_date ? new Date(row.hr.hire_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setHrEmploymentStatus(row.hr?.employment_status ?? "active");
    setHrDialogError(null);
  }

  async function submitHrProfile() {
    if (!editingHrRow) return;
    if (!hrDesignation.trim() || !hrDepartment.trim() || !hrPhone.trim() || !hrSalary.trim() || !hrHireDate) {
      setHrDialogError("All fields are required.");
      return;
    }
    const salaryNum = Number(hrSalary);
    if (Number.isNaN(salaryNum) || salaryNum < 0) {
      setHrDialogError("Salary must be a non-negative number.");
      return;
    }

    setHrSubmitting(true);
    setHrDialogError(null);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editingHrRow.name,
          email: editingHrRow.email,
          phone: hrPhone.trim(),
          designation: hrDesignation.trim(),
          department: hrDepartment.trim(),
          salary: salaryNum,
          hire_date: new Date(hrHireDate).toISOString(),
          employment_status: hrEmploymentStatus,
          user_id: editingHrRow.user_id,
          branch_id: editingHrRow.branch?.id || null,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? `Request failed (${res.status})`);
      }

      toast({
        title: editingHrRow.hr ? "HR profile updated" : "HR profile created",
        tone: "success",
      });
      setEditingHrRow(null);
      await list.reload();
    } catch (e) {
      setHrDialogError(e instanceof Error ? e.message : "Failed to save HR profile");
    } finally {
      setHrSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Team"
        title="Employees"
        description={
          admin
            ? "Every staff account across all branches. Inspect last-login activity, HR profiles, and (with your password) remove or deactivate accounts."
            : `Employees attached to ${user?.branch?.name ?? "your branch"}. Tap a row to see their HR profile.`
        }
      />

      <Card>
        <CardContent className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
            <div className="grid gap-1.5">
              <Label htmlFor="emp-search">Search</Label>
              <Input
                id="emp-search"
                placeholder="Name, email, phone, designation…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(admin ? ROLE_FILTERS_ADMIN : ROLE_FILTERS_BASE).map(
                    (opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {admin ? (
              <div className="grid gap-1.5">
                <Label>Branch</Label>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b._id} value={b._id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-1.5">
                <Label>Branch</Label>
                <div className="flex h-9 items-center rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] px-3 text-[12.5px] text-[hsl(var(--muted-foreground))]">
                  {user?.branch?.name ?? "—"}
                </div>
              </div>
            )}
          </div>

          {list.loading && !list.data ? (
            <Skeleton className="h-64 w-full" />
          ) : filteredRows.length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="size-4" />}
              title="No employees match"
              description={
                query || roleFilter !== "all" || statusFilter !== "all"
                  ? "Try widening your filters."
                  : "No employees have been onboarded yet."
              }
            />
          ) : (
            <SlimTable<EmployeeRow>
              rowKey={(r) => r.user_id}
              columns={[
                {
                  key: "name",
                  header: "Employee",
                  cell: (r) => (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId((cur) =>
                          cur === r.user_id ? null : r.user_id,
                        )
                      }
                      className="flex items-center gap-2.5 text-left"
                    >
                      <Avatar className="size-7">
                        <AvatarFallback className="text-[10.5px]">
                          {initials(r.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid">
                        <span className="font-medium">{r.name}</span>
                        <span className="text-[11.5px] text-[hsl(var(--muted-foreground))]">
                          {r.email}
                        </span>
                      </div>
                    </button>
                  ),
                },
                {
                  key: "role",
                  header: "Role",
                  cell: (r) => (
                    <Badge
                      variant={roleVariant(r.role)}
                      dot
                      className="capitalize"
                    >
                      {r.role}
                    </Badge>
                  ),
                },
                {
                  key: "phone",
                  header: "Phone",
                  cell: (r) => (
                    <span className="text-[hsl(var(--muted-foreground))]">
                      {r.phone || "—"}
                    </span>
                  ),
                },
                ...(admin
                  ? [
                      {
                        key: "branch",
                        header: "Branch",
                        cell: (r: EmployeeRow) => (
                          <span className="text-[hsl(var(--muted-foreground))]">
                            {r.branch
                              ? `${r.branch.name}`
                              : r.role === "admin"
                                ? "—"
                                : "Unassigned"}
                          </span>
                        ),
                      },
                    ]
                  : []),
                {
                  key: "last_login",
                  header: "Last sign-in",
                  cell: (r) => (
                    <span
                      className={
                        r.last_login
                          ? "text-[hsl(var(--foreground))]"
                          : "text-[hsl(var(--muted-foreground))]"
                      }
                      title={r.last_login ?? "Never signed in"}
                    >
                      {timeAgo(r.last_login)}
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
                      {r.is_active ? "Active" : "Inactive"}
                    </Badge>
                  ),
                },
                ...(admin
                  ? [
                      {
                        key: "actions",
                        header: "",
                        align: "right" as const,
                        cell: (r: EmployeeRow) => {
                          const isSelf = r.user_id === user?.id;
                          return (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant={r.is_active ? "outline" : "default"}
                                disabled={isSelf || togglingId === r.user_id}
                                onClick={() => void toggleActive(r)}
                              >
                                {togglingId === r.user_id
                                  ? "Working…"
                                  : r.is_active
                                    ? "Deactivate"
                                    : "Activate"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={isSelf}
                                title={
                                  isSelf
                                    ? "You cannot delete your own account"
                                    : "Hard delete (admin password required)"
                                }
                                className="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                                onClick={() => openDelete(r)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          );
                        },
                      },
                    ]
                  : []),
              ]}
              rows={filteredRows}
            />
          )}

          {expandedId ? (
            <ExpandedHrDetail
              row={filteredRows.find((r) => r.user_id === expandedId) ?? null}
              onClose={() => setExpandedId(null)}
              onEdit={() => {
                const r = filteredRows.find((x) => x.user_id === expandedId);
                if (r) openHrDialog(r);
              }}
            />
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) closeDelete();
        }}
      >
        {pendingDelete ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{`Permanently delete "${pendingDelete.name}"?`}</DialogTitle>
              <DialogDescription>
                This removes the user account and any linked HR profile. The
                request is blocked if the account has historical orders or HR
                records — in that case, deactivate instead.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              <Label htmlFor="emp-admin-password">
                Confirm with your admin password
              </Label>
              <Input
                id="emp-admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                onClick={closeDelete}
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
                {dialogSubmitting ? "Deleting…" : "Delete forever"}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog
        open={!!editingHrRow}
        onOpenChange={(open) => {
          if (!open) setEditingHrRow(null);
        }}
      >
        {editingHrRow ? (
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>
                {editingHrRow.hr ? `Edit "${editingHrRow.name}" HR Profile` : `Create HR Profile for "${editingHrRow.name}"`}
              </DialogTitle>
              <DialogDescription>
                Provide details like designation, department, and salary for people operations.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="hr-designation">Designation</Label>
                <Input
                  id="hr-designation"
                  placeholder="e.g. Senior Chef, Floor Supervisor"
                  value={hrDesignation}
                  onChange={(e) => setHrDesignation(e.target.value)}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="hr-department">Department</Label>
                <Input
                  id="hr-department"
                  placeholder="e.g. Kitchen, Service, Management"
                  value={hrDepartment}
                  onChange={(e) => setHrDepartment(e.target.value)}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="hr-phone">Phone number</Label>
                <Input
                  id="hr-phone"
                  placeholder="e.g. +92 300 1234567"
                  value={hrPhone}
                  onChange={(e) => setHrPhone(e.target.value)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="hr-salary">Salary (PKR)</Label>
                  <Input
                    id="hr-salary"
                    type="number"
                    min="0"
                    placeholder="e.g. 50000"
                    value={hrSalary}
                    onChange={(e) => setHrSalary(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="hr-hiredate">Hire date</Label>
                  <Input
                    id="hr-hiredate"
                    type="date"
                    value={hrHireDate}
                    onChange={(e) => setHrHireDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="hr-status">Employment status</Label>
                <Select value={hrEmploymentStatus} onValueChange={setHrEmploymentStatus}>
                  <SelectTrigger id="hr-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="resigned">Resigned</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hrDialogError ? (
                <p className="text-[12px] text-[hsl(var(--destructive))]">
                  {hrDialogError}
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingHrRow(null)}
                disabled={hrSubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void submitHrProfile()}
                disabled={hrSubmitting}
              >
                {hrSubmitting ? "Saving…" : "Save Details"}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function ExpandedHrDetail({
  row,
  onClose,
  onEdit,
}: {
  row: EmployeeRow | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  if (!row) return null;

  return (
    <div className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.25)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <UserRoundCog className="size-4 text-[hsl(var(--muted-foreground))]" />
          <div className="text-[13px] font-semibold tracking-[-0.005em]">
            {row.name}{" "}
            <span className="text-[hsl(var(--muted-foreground))]">
              · HR profile
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {row.hr ? (
            <Button size="sm" variant="outline" onClick={onEdit}>
              Edit Profile
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {row.hr ? (
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Designation" value={row.hr.designation} />
          <DetailItem label="Department" value={row.hr.department} />
          <DetailItem label="Phone" value={row.hr.phone} />
          <DetailItem
            label="Salary"
            value={formatCurrency(row.hr.salary)}
          />
          <DetailItem
            label="Hire date"
            value={formatDate(row.hr.hire_date)}
          />
          <DetailItem
            label="Employment status"
            value={
              <Badge
                variant={
                  row.hr.employment_status === "active" ? "success" : "muted"
                }
                className="capitalize"
              >
                {row.hr.employment_status}
              </Badge>
            }
          />
        </dl>
      ) : (
        <div className="grid gap-3">
          <p className="text-[12.5px] text-[hsl(var(--muted-foreground))]">
            No HR profile linked to this account. Add one to surface salary, department, phone and hire-date details here.
          </p>
          <div>
            <Button size="sm" onClick={onEdit}>
              Create HR Profile
            </Button>
          </div>
        </div>
      )}

      <div className="mt-3 grid gap-x-6 gap-y-1 border-t border-[hsl(var(--border))] pt-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailItem label="Email" value={row.email} />
        <DetailItem
          label="Branch"
          value={row.branch ? `${row.branch.name} · ${row.branch.city}` : "—"}
        />
        <DetailItem
          label="Account created"
          value={formatDate(row.created_at)}
        />
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
        {label}
      </dt>
      <dd className="text-[13px] text-[hsl(var(--foreground))]">{value}</dd>
    </div>
  );
}
