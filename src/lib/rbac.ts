export const SIGNUP_ROLES = [
  "admin",
  "manager",
  "cashier",
  "chef",
] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

/**
 * Every role known to the system. `SIGNUP_ROLES` is the public registration
 * subset — these accounts land in `approval_status: "pending"` and are
 * activated by an admin from the Users page. Waiter accounts are admin-only
 * (no login); hr is back-office only.
 */
export const APP_ROLES = [
  "admin",
  "manager",
  "cashier",
  "waiter",
  "chef",
  "hr",
] as const;
export type AppRole = (typeof APP_ROLES)[number];
export type KnownRole = AppRole;

/** Every role except admin must be tied to a branch at signup time. */
export function roleRequiresBranch(role: string): boolean {
  return normRole(role) !== "admin";
}

export type NavKey =
  | "pos"
  | "place-order"
  | "orders"
  | "kitchen"
  | "menu"
  | "inventory"
  | "expenses"
  | "payments"
  | "customers"
  | "users"
  | "branches"
  | "employees"
  | "reports";

/** Which roles may see each sidebar route. Admin always has full access via `isAdmin`. */
function normRole(role: string): string {
  return String(role ?? "").trim().toLowerCase();
}

export const NAV_ACCESS: Record<NavKey, AppRole[]> = {
  pos: ["admin", "manager", "cashier", "waiter"],
  "place-order": ["cashier"],
  orders: ["admin", "manager", "cashier", "waiter", "chef"],
  kitchen: ["admin", "manager", "cashier", "chef"],
  menu: ["admin", "manager"],
  inventory: ["admin", "manager"],
  expenses: ["admin", "manager"],
  payments: ["admin", "manager", "cashier"],
  customers: ["admin", "manager", "cashier", "waiter"],
  users: ["admin"],
  branches: ["admin"],
  employees: ["admin", "manager"],
  reports: ["admin", "manager"],
};

export function isAdmin(role: string): boolean {
  return normRole(role) === "admin";
}

export function roleHasNavAccess(role: string, key: NavKey): boolean {
  const r = normRole(role);
  if (r === "admin" && key === "place-order") return false; // Admin cannot place orders
  if (r === "admin") return true;
  const allowed = NAV_ACCESS[key];
  return allowed.includes(r as AppRole);
}

export function canPlaceOrders(role: string): boolean {
  const r = normRole(role);
  return r === "cashier";
}

/**
 * The kitchen display is a chef workspace: accept tickets, mark them ready.
 * Admins keep access for support. Managers can see but not act (we still
 * gate the buttons in the UI).
 */
export function canOperateKitchen(role: string): boolean {
  const r = normRole(role);
  return r === "chef" || r === "admin";
}

/**
 * Floor staff mark orders served (after pickup from the pass) and completed
 * (after payment). Kitchen transitions (preparing / ready) use
 * {@link canOperateKitchen} instead.
 */
/** Mark order served after pickup from the pass. */
export function canCloseOrder(role: string): boolean {
  const r = normRole(role);
  return (
    r === "cashier" ||
    r === "waiter" ||
    r === "manager" ||
    r === "admin"
  );
}

/** Close the ticket after payment (cashier / manager / admin). */
export function canCompleteOrder(role: string): boolean {
  const r = normRole(role);
  return r === "cashier" || r === "manager" || r === "admin";
}

/**
 * Cancelling is reserved for cashier/manager/admin — waiters cannot void a
 * ticket on their own.
 */
export function canCancelOrder(role: string): boolean {
  const r = normRole(role);
  return r === "cashier" || r === "manager" || r === "admin";
}

/** Cashier, admin, or manager may record that an order was paid. */
export function canRecordOrderPayment(role: string): boolean {
  const r = normRole(role);
  return r === "cashier" || r === "admin" || r === "manager";
}

export function canManageInventory(role: string): boolean {
  const r = normRole(role);
  return r === "manager" || r === "admin";
}

export function canManageStaffUsers(role: string): boolean {
  return normRole(role) === "admin";
}

/** Only admins can create/activate/deactivate branches. */
export function canManageBranches(role: string): boolean {
  return normRole(role) === "admin";
}

/**
 * Admins see the full directory; managers see only their own branch.
 * The API layer is responsible for enforcing the branch scope — this helper
 * just gates *access* to the page.
 */
export function canViewBranchEmployees(role: string): boolean {
  const r = normRole(role);
  return r === "admin" || r === "manager";
}

/** Deactivating / deleting an employee is admin-only and password-confirmed. */
export function canDeleteEmployee(role: string): boolean {
  return normRole(role) === "admin";
}

export function parseSignupRole(value: unknown): SignupRole | null {
  const r = String(value ?? "").toLowerCase();
  if (SIGNUP_ROLES.includes(r as SignupRole)) return r as SignupRole;
  return null;
}

/**
 * Canonical permission keys.
 *
 * The actual gates live in the helpers above and in the per-route checks —
 * these strings are the *human-facing* surface of the same concept, written
 * to the `roles` collection so internal admin surfaces can use a single source
 * of truth for "what can this role do?".
 *
 * Keep this list and {@link ROLE_PERMISSIONS} in sync with the helpers above
 * whenever new gates are introduced.
 */
export const PERMISSION_KEYS = [
  "pos.access",
  "orders.view",
  "orders.create",
  "orders.cancel",
  "orders.close",
  "kitchen.access",
  "kitchen.operate",
  "payments.view",
  "payments.record",
  "menu.manage",
  "inventory.view",
  "inventory.manage",
  "expenses.manage",
  "customers.manage",
  "employees.view",
  "employees.manage",
  "branches.manage",
  "users.manage",
  "reports.view",
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  "pos.access": "Open POS workspace",
  "orders.view": "View orders",
  "orders.create": "Create orders",
  "orders.cancel": "Cancel orders",
  "orders.close": "Mark orders served and completed (after payment)",
  "kitchen.access": "Open kitchen display",
  "kitchen.operate": "Accept tickets and mark ready",
  "payments.view": "View payments",
  "payments.record": "Record order payments",
  "menu.manage": "Manage menu and categories",
  "inventory.view": "View inventory",
  "inventory.manage": "Manage inventory and purchases",
  "expenses.manage": "Manage expenses",
  "customers.manage": "Manage customers",
  "employees.view": "View employee directory",
  "employees.manage": "Manage employees and HR",
  "branches.manage": "Manage branches",
  "users.manage": "Manage staff accounts and roles",
  "reports.view": "View reports and analytics",
};

/**
 * Source-of-truth: every canonical role in the system, the badge tone we
 * paint it with, a short description for admin role references, and the
 * exact set of {@link PermissionKey}s the role carries. Admin is treated as
 * implicit "everything"; we still spell it out so the UI can render the full
 * matrix without special cases.
 */
export type RoleDefinition = {
  role_name: KnownRole;
  description: string;
  badge: "primary" | "warning" | "success" | "outline" | "muted";
  permissions: PermissionKey[];
};

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    role_name: "admin",
    description:
      "Owner of the workspace. Full access to every branch, every module, and every override.",
    badge: "primary",
    permissions: [...PERMISSION_KEYS],
  },
  {
    role_name: "manager",
    description:
      "Branch lead. Runs day-to-day operations, manages staff, menu, inventory, and reports for their branch.",
    badge: "warning",
    permissions: [
      "pos.access",
      "orders.view",
      "orders.cancel",
      "orders.close",
      "kitchen.access",
      "payments.view",
      "payments.record",
      "menu.manage",
      "inventory.view",
      "inventory.manage",
      "expenses.manage",
      "customers.manage",
      "employees.view",
      "employees.manage",
      "reports.view",
    ],
  },
  {
    role_name: "cashier",
    description:
      "Front-of-house till. Places orders, marks served, collects payment after serving, then closes tickets.",
    badge: "success",
    permissions: [
      "pos.access",
      "orders.view",
      "orders.create",
      "orders.cancel",
      "orders.close",
      "kitchen.access",
      "payments.view",
      "payments.record",
      "customers.manage",
    ],
  },
  {
    role_name: "waiter",
    description:
      "Floor staff. Places orders for tables and hands them off to the cashier for payment.",
    badge: "outline",
    permissions: [
      "pos.access",
      "orders.view",
      "orders.create",
      "orders.close",
      "customers.manage",
    ],
  },
  {
    role_name: "chef",
    description:
      "Kitchen line. Claims tickets from the queue and marks them ready for pickup.",
    badge: "muted",
    permissions: ["orders.view", "kitchen.access", "kitchen.operate"],
  },
  {
    role_name: "hr",
    description:
      "People operations. Manages the employee directory, payroll, and attendance — no POS access.",
    badge: "muted",
    permissions: ["employees.view", "employees.manage"],
  },
];

export const ROLE_PERMISSIONS: Record<KnownRole, PermissionKey[]> =
  ROLE_DEFINITIONS.reduce(
    (acc, def) => {
      acc[def.role_name] = def.permissions;
      return acc;
    },
    {} as Record<KnownRole, PermissionKey[]>,
  );

export function describePermission(key: string): string {
  return PERMISSION_LABELS[key as PermissionKey] ?? key;
}
