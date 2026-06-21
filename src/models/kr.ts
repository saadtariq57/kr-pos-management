import mongoose, { Schema } from "mongoose";

import { INVENTORY_UNITS } from "@/lib/inventory-units";

const { ObjectId } = Schema.Types;

const USER_ROLES = ["admin", "manager", "cashier", "chef", "waiter", "hr"] as const;
const ORDER_TYPES = ["dine-in", "takeaway"] as const;
const ORDER_STATUSES = [
  "pending",
  "preparing",
  "ready",
  "served",
  "completed",
  "cancelled",
] as const;
const PAYMENT_METHODS = ["cash", "card", "online"] as const;
const RESERVATION_STATUSES = ["pending", "confirmed", "cancelled"] as const;
const EMPLOYMENT_STATUSES = ["active", "resigned", "terminated"] as const;
const EXPENSE_TYPES = [
  "rent",
  "salary",
  "utility",
  "utilities",
  "salaries",
  "supplies",
  "marketing",
  "maintenance",
  "other",
] as const;

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    // Email and password are optional because waiter accounts are created
    // in-app for shift/order assignment only and never log in. The unique
    // index is sparse so multiple emailless waiters don't collide. NOTE:
    // if you previously deployed with a non-sparse unique index on `email`,
    // drop it via `db.users.dropIndex("email_1")` so the new spec applies.
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      index: true,
    },
    password_hash: { type: String, default: null },
    phone: { type: String, default: "", trim: true },
    role: { type: String, required: true, enum: USER_ROLES },
    // Admins are global (branch_id = null); every other role must be tied to a branch.
    // We enforce that at the API layer (signup) rather than in the schema so we
    // can still seed/legacy-migrate admin-only documents safely.
    branch_id: { type: ObjectId, ref: "Branch", default: null, index: true },
    approval_status: {
      type: String,
      required: true,
      enum: ["pending", "approved"],
      default: "approved",
    },
    is_active: { type: Boolean, default: true },
    email_verified: { type: Boolean, default: false, index: true },
    email_verification_token: { type: String, default: null, index: true },
    email_verification_expires: { type: Date, default: null },
    email_verified_at: { type: Date, default: null },
    created_at: { type: Date, default: Date.now },
    last_login: { type: Date, default: null },
  },
  { collection: "users", versionKey: false },
);

// Branches – soft-deletable. Deactivating a branch cascades to its non-admin users.
const BranchSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
    city: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    is_active: { type: Boolean, default: true, index: true },
    created_at: { type: Date, default: Date.now, index: true },
    deactivated_at: { type: Date, default: null },
  },
  { collection: "branches", versionKey: false },
);

// Roles
// 
const RoleSchema = new Schema(
  {
    role_name: { type: String, required: true, unique: true, trim: true, index: true },
    permissions: { type: [String], default: [] },
    created_at: { type: Date, default: Date.now },
  },
  { collection: "roles", versionKey: false },
);

// Customers
const CustomerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: null, index: true },
    loyalty_points: { type: Number, default: 0, min: 0 },
    created_at: { type: Date, default: Date.now },
  },
  { collection: "customers", versionKey: false },
);

// Orders
//
// Roles attached to a ticket:
//   `staff_id`            – cashier who created the order (kept name for
//                           backwards compatibility with existing rows).
//   `waiter_id`           – waiter who brought the order to the cashier.
//                           Required at checkout so the kitchen + pass know
//                           who to hand the food back to.
//   `accepted_by_chef_id` – the chef who claimed the ticket from the queue.
//                           Set when the order moves pending → preparing.
//   `branch_id`           – mirrored from the cashier's branch so kitchen
//                           displays + chef notifications stay scoped per
//                           branch without a join.
const OrderSchema = new Schema(
  {
    order_number: { type: Number, required: true, unique: true, index: true },
    customer_id: { type: ObjectId, ref: "Customer", default: null, index: true },
    staff_id: { type: ObjectId, ref: "User", default: null, index: true },
    waiter_id: { type: ObjectId, ref: "User", default: null, index: true },
    accepted_by_chef_id: {
      type: ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    accepted_at: { type: Date, default: null },
    completed_at: { type: Date, default: null },
    branch_id: { type: ObjectId, ref: "Branch", default: null, index: true },
    order_type: { type: String, required: true, enum: ORDER_TYPES },
    table_number: { type: Number, default: null },
    subtotal_amount: { type: Number, required: true, min: 0, default: 0 },
    tax_amount: { type: Number, required: true, min: 0, default: 0 },
    discount_amount: { type: Number, required: true, min: 0, default: 0 },
    final_amount: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, required: true, enum: ORDER_STATUSES, index: true },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { collection: "orders", versionKey: false },
);

// Order Items
const OrderItemSchema = new Schema(
  {
    order_id: { type: ObjectId, ref: "Order", required: true, index: true },
    menu_item_id: { type: ObjectId, ref: "MenuItem", required: true, index: true },
    quantity: { type: Number, required: true, min: 1 },
    unit_price: { type: Number, required: true, min: 0 },
    total_price: { type: Number, required: true, min: 0 },
  },
  { collection: "order_items", versionKey: false },
);

// Payments
const PaymentSchema = new Schema(
  {
    order_id: { type: ObjectId, ref: "Order", required: true, index: true },
    payment_method: { type: String, required: true, enum: PAYMENT_METHODS },
    payment_status: { type: String, required: true, default: "pending", index: true },
    transaction_reference: { type: String, default: null, trim: true },
    paid_at: { type: Date, default: null },
  },
  { collection: "payments", versionKey: false },
);

// Menu & Categories
const CategorySchema = new Schema(
  {
    category_name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    is_active: { type: Boolean, default: true },
  },
  { collection: "categories", versionKey: false },
);

const MenuItemSchema = new Schema(
  {
    category_id: { type: ObjectId, ref: "Category", required: true, index: true },
    item_name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    cost_price: { type: Number, required: true, min: 0 },
    availability_status: { type: String, required: true, default: "available", index: true },
    image_url: { type: String, default: null },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { collection: "menu_items", versionKey: false },
);

// Inventory & Stock
const InventorySchema = new Schema(
  {
    raw_material_name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, required: true, enum: [...INVENTORY_UNITS] },
    reorder_level: { type: Number, required: true, min: 0, default: 0 },
    supplier_id: { type: ObjectId, ref: "Supplier", default: null, index: true },
    last_updated: { type: Date, default: Date.now, index: true },
  },
  { collection: "inventory", versionKey: false },
);

const SupplierSchema = new Schema(
  {
    supplier_name: { type: String, required: true, trim: true },
    contact_number: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { collection: "suppliers", versionKey: false },
);

const PurchaseItemSchema = new Schema(
  {
    inventory_id: { type: ObjectId, ref: "Inventory", default: null },
    raw_material_name: { type: String, default: null, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: null, enum: ["kg", "liter", "pcs", null] },
    unit_cost: { type: Number, required: true, min: 0 },
    total_cost: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const PurchaseSchema = new Schema(
  {
    supplier_id: { type: ObjectId, ref: "Supplier", required: true, index: true },
    items: { type: [PurchaseItemSchema], default: [] },
    total_cost: { type: Number, required: true, min: 0, default: 0 },
    purchase_date: { type: Date, required: true, default: Date.now, index: true },
  },
  { collection: "purchases", versionKey: false },
);

// Sales / Analytics
const SalesSummarySchema = new Schema(
  {
    date: { type: Date, required: true, index: true, unique: true },
    total_orders: { type: Number, required: true, min: 0, default: 0 },
    total_revenue: { type: Number, required: true, min: 0, default: 0 },
    total_tax: { type: Number, required: true, min: 0, default: 0 },
    total_discount: { type: Number, required: true, min: 0, default: 0 },
    net_profit: { type: Number, required: true, default: 0 },
    created_at: { type: Date, default: Date.now },
  },
  { collection: "sales_summary", versionKey: false },
);

// Expenses
const ExpenseSchema = new Schema(
  {
    branch_id: { type: ObjectId, ref: "Branch", required: true, index: true },
    expense_type: { type: String, required: true, enum: EXPENSE_TYPES, index: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, default: "" },
    expense_date: { type: Date, required: true, index: true },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { collection: "expenses", versionKey: false },
);

// Reservations
const ReservationSchema = new Schema(
  {
    customer_id: { type: ObjectId, ref: "Customer", required: true, index: true },
    table_number: { type: Number, required: true, index: true },
    reservation_date: { type: Date, required: true, index: true },
    reservation_time: { type: String, required: true, trim: true },
    status: { type: String, required: true, enum: RESERVATION_STATUSES, index: true },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { collection: "reservations", versionKey: false },
);

// Employees / HR
//
// An Employee row captures the HR-side profile (salary, hire date, department).
// It is *optionally* linked to a User account via `user_id` — most staff who log
// in have both a User (for auth/last_login/role/branch) and an Employee (for HR).
// `branch_id` is mirrored here so HR-only employees who never log in can still
// be filtered per-branch on the Employees directory page.
const EmployeeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: null, trim: true, unique: true, sparse: true, index: true },
    phone: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    salary: { type: Number, required: true, min: 0 },
    hire_date: { type: Date, required: true },
    employment_status: {
      type: String,
      required: true,
      enum: EMPLOYMENT_STATUSES,
      index: true,
    },
    user_id: {
      type: ObjectId,
      ref: "User",
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },
    branch_id: { type: ObjectId, ref: "Branch", default: null, index: true },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { collection: "employees", versionKey: false },
);

const PayrollSchema = new Schema(
  {
    employee_id: { type: ObjectId, ref: "Employee", required: true, index: true },
    basic_salary: { type: Number, required: true, min: 0 },
    bonus: { type: Number, required: true, min: 0, default: 0 },
    deductions: { type: Number, required: true, min: 0, default: 0 },
    net_salary: { type: Number, required: true, min: 0 },
    payment_date: { type: Date, required: true, index: true },
  },
  { collection: "payroll", versionKey: false },
);

// Notifications
//
// A lightweight in-app notification bus polled by the topbar bell. Each row is
// addressed either to a specific user (`recipient_user_id`) or broadcast to a
// role within a branch (e.g. every chef in branch X gets new-order alerts).
// We don't use websockets — clients poll `/api/notifications?unread=1` every
// few seconds, which is plenty responsive for restaurant operations and far
// simpler to deploy on serverless/edge runtimes.
const NotificationSchema = new Schema(
  {
    branch_id: { type: ObjectId, ref: "Branch", default: null, index: true },
    recipient_role: { type: String, default: null, index: true },
    recipient_user_id: {
      type: ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    type: { type: String, required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    order_id: { type: ObjectId, ref: "Order", default: null, index: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    read_at: { type: Date, default: null, index: true },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { collection: "notifications", versionKey: false },
);

// Analytics logs
const AnalyticsLogSchema = new Schema(
  {
    user_id: { type: ObjectId, ref: "User", required: true, index: true },
    activity_type: { type: String, required: true, trim: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { collection: "analytics_logs", versionKey: false },
);

/**
 * Register (or re-register) a Mongoose model.
 *
 * In Next.js dev mode, this file gets re-evaluated on every hot reload, but
 * the underlying `mongoose` instance is shared globally and caches every
 * registered model on `mongoose.models`. The common
 * `mongoose.models.X || mongoose.model("X", schema)` pattern returns the
 * STALE cached model if the schema has been edited — so newly added fields
 * (e.g. `branch_id`) get silently stripped on write because Mongoose's
 * default `strict: true` mode discards unknown paths.
 *
 * Forcing a fresh registration here means schema edits take effect on the
 * next HMR cycle without restarting the dev server. In production this
 * branch only runs once at boot, so the delete is a harmless no-op.
 */
function registerModel<T>(
  name: string,
  schema: mongoose.Schema,
): mongoose.Model<T> {
  if (mongoose.models[name]) {
    delete mongoose.models[name];
  }
  return mongoose.model<T>(name, schema);
}

export const User = registerModel("User", UserSchema);
export const Branch = registerModel("Branch", BranchSchema);
export const Role = registerModel("Role", RoleSchema);
export const Customer = registerModel("Customer", CustomerSchema);
export const Order = registerModel("Order", OrderSchema);
export const OrderItem = registerModel("OrderItem", OrderItemSchema);
export const Payment = registerModel("Payment", PaymentSchema);
export const Category = registerModel("Category", CategorySchema);
export const MenuItem = registerModel("MenuItem", MenuItemSchema);
export const Inventory = registerModel("Inventory", InventorySchema);
export const Supplier = registerModel("Supplier", SupplierSchema);
export const Purchase = registerModel("Purchase", PurchaseSchema);
export const SalesSummary = registerModel("SalesSummary", SalesSummarySchema);
export const Expense = registerModel("Expense", ExpenseSchema);
export const Reservation = registerModel("Reservation", ReservationSchema);
export const Employee = registerModel("Employee", EmployeeSchema);
export const Payroll = registerModel("Payroll", PayrollSchema);
export const AnalyticsLog = registerModel("AnalyticsLog", AnalyticsLogSchema);
export const Notification = registerModel("Notification", NotificationSchema);

