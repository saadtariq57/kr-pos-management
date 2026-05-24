/**
 * Order status machine.
 *
 * Restaurant flow:
 *   pending   → preparing  : chef accepts the ticket (kitchen display).
 *   preparing → ready      : chef finishes cooking.
 *   ready     → served     : cashier / waiter hands off to the customer.
 *   served    → completed  : cashier closes the ticket after payment.
 *   *         → cancelled  : cashier / manager voids the ticket.
 *
 * Payment is recorded only while status is `served`. Completing an order
 * requires a paid payment record (enforced in the orders PATCH handler).
 */
import type { SessionUser } from "@/lib/auth-server";
import {
  canCancelOrder,
  canCloseOrder,
  canCompleteOrder,
  canOperateKitchen,
} from "@/lib/rbac";

export const ORDER_STATUSES = [
  "pending",
  "preparing",
  "ready",
  "served",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isTerminalStatus(s: string): boolean {
  return s === "completed" || s === "cancelled";
}

const FORWARD: Record<string, OrderStatus[]> = {
  pending: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "cancelled"],
  served: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export type TransitionError = {
  ok: false;
  status: number;
  error: string;
};

export type TransitionOk = {
  ok: true;
};

/**
 * Validate that `from → to` is a legal status hop AND that `actor` is allowed
 * to make it. Returns a structured error so the API layer can decide on the
 * HTTP status.
 *
 * `currentAcceptedBy` is the chef who claimed the ticket (or null). When a
 * chef tries to mark a ticket "ready" we require it to be either the same
 * chef or an admin override — otherwise two chefs could double-claim.
 */
export function checkOrderTransition(args: {
  from: string;
  to: string;
  actor: Pick<SessionUser, "id" | "role">;
  currentAcceptedBy: string | null;
}): TransitionOk | TransitionError {
  const { from, to, actor, currentAcceptedBy } = args;

  if (!ORDER_STATUSES.includes(to as OrderStatus)) {
    return { ok: false, status: 400, error: `Unknown status "${to}"` };
  }
  if (from === to) return { ok: true };

  const allowed = FORWARD[from] ?? [];
  if (!allowed.includes(to as OrderStatus)) {
    return {
      ok: false,
      status: 400,
      error: `Cannot move order from "${from}" to "${to}"`,
    };
  }

  if (to === "cancelled") {
    return canCancelOrder(actor.role)
      ? { ok: true }
      : {
          ok: false,
          status: 403,
          error: "Only cashier, manager, or admin can cancel an order",
        };
  }

  const role = actor.role.toLowerCase();

  if (to === "preparing") {
    if (!canOperateKitchen(actor.role)) {
      return {
        ok: false,
        status: 403,
        error: "Only the kitchen can accept a ticket",
      };
    }
    return { ok: true };
  }

  if (to === "ready") {
    if (!canOperateKitchen(actor.role)) {
      return {
        ok: false,
        status: 403,
        error: "Only the kitchen can mark a ticket ready",
      };
    }
    if (
      role === "chef" &&
      currentAcceptedBy &&
      currentAcceptedBy !== actor.id
    ) {
      return {
        ok: false,
        status: 403,
        error: "This ticket was accepted by another chef",
      };
    }
    return { ok: true };
  }

  if (to === "served") {
    return canCloseOrder(actor.role)
      ? { ok: true }
      : {
          ok: false,
          status: 403,
          error: "Only floor staff can mark an order served",
        };
  }

  if (to === "completed") {
    return canCompleteOrder(actor.role)
      ? { ok: true }
      : {
          ok: false,
          status: 403,
          error: "Only cashier, manager, or admin can complete an order",
        };
  }

  return { ok: false, status: 400, error: "Transition not allowed" };
}

/** Status values a role may pick in UI dropdowns (excludes current). */
export function allowedStatusTargetsForRole(
  role: string,
  from: string,
): OrderStatus[] {
  const next = FORWARD[from] ?? [];
  return next.filter((to) => {
    const result = checkOrderTransition({
      from,
      to,
      actor: { id: "preview", role },
      currentAcceptedBy: null,
    });
    return result.ok;
  });
}
