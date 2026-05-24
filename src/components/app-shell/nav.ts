import type { NavKey } from "@/lib/rbac";
import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  CookingPot,
  CreditCard,
  IdCard,
  LayoutGrid,
  ShieldCheck,
  ShoppingBasket,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";

export type AppNavItem = {
  key: NavKey;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const appNav: AppNavItem[] = [
  { key: "pos", label: "POS", href: "/pos", icon: LayoutGrid },
  {
    key: "place-order",
    label: "New order",
    href: "/pos/place-order",
    icon: ShoppingCart,
  },
  { key: "orders", label: "Orders", href: "/pos/orders", icon: ClipboardList },
  { key: "kitchen", label: "Kitchen", href: "/pos/kitchen", icon: CookingPot },
  { key: "menu", label: "Menu", href: "/pos/menu", icon: ShoppingBasket },
  { key: "inventory", label: "Inventory", href: "/pos/inventory", icon: Boxes },
  { key: "expenses", label: "Expenses", href: "/pos/expenses", icon: Wallet },
  { key: "payments", label: "Payments", href: "/pos/payments", icon: CreditCard },
  { key: "customers", label: "Customers", href: "/pos/customers", icon: Users },
  { key: "employees", label: "Employees", href: "/pos/employees", icon: IdCard },
  { key: "users", label: "Users", href: "/pos/users", icon: ShieldCheck },
  { key: "branches", label: "Branches", href: "/pos/branches", icon: Building2 },
  { key: "reports", label: "Reports", href: "/pos/reports", icon: BarChart3 },
];

/**
 * Picks the nav item whose `href` is the longest prefix of `pathname`.
 *
 * This avoids the bug where every `/pos/...` route would highlight the
 * top-level "POS" item (href `/pos`) alongside the actual section, because
 * a naïve `startsWith` check matches both. Returning the *most specific*
 * match means only the deepest item — e.g. `/pos/branches` — lights up.
 */
export function activeNavKey(
  pathname: string | null | undefined,
  items: AppNavItem[],
): string | null {
  if (!pathname) return null;
  let bestKey: string | null = null;
  let bestLen = -1;
  for (const item of items) {
    const matches =
      pathname === item.href || pathname.startsWith(item.href + "/");
    if (matches && item.href.length > bestLen) {
      bestLen = item.href.length;
      bestKey = item.key;
    }
  }
  return bestKey;
}
