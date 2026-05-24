"use client";

import Link from "next/link";
import * as React from "react";
import { Bell, CheckCheck, Inbox } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/toast";
import { apiGet, apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type NotificationRow = {
  _id: string;
  type: string;
  title: string;
  body?: string;
  order_id?: string | null;
  read_at?: string | null;
  created_at: string;
};

type FeedResponse = {
  items: NotificationRow[];
  unread_count: number;
};

const POLL_MS = 5000;

function formatRelative(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const sec = Math.max(0, Math.round((now - t) / 1000));
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

/**
 * Topbar notification bell.
 *
 * Polls `/api/notifications?unread=1` every 5s. New rows (i.e. ids we
 * haven't seen before) fire a toast so the user gets a glance-able alert
 * even when the popover is closed. The popover itself shows the latest 20
 * notifications and lets the user mark them read individually or all at
 * once.
 *
 * We intentionally avoid websockets — polling is reliable, works on
 * serverless, and keeps the implementation simple for a project this size.
 */
export function NotificationBell() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [feed, setFeed] = React.useState<FeedResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const seenIds = React.useRef<Set<string>>(new Set());
  const firstLoadDone = React.useRef(false);

  const reload = React.useCallback(
    async (announce: boolean) => {
      try {
        const res = await apiGet<FeedResponse>("/api/notifications?limit=20");
        setFeed(res);

        if (announce && firstLoadDone.current) {
          for (const n of res.items) {
            if (n.read_at) continue;
            if (seenIds.current.has(n._id)) continue;
            seenIds.current.add(n._id);
            toast({
              title: n.title,
              description: n.body || undefined,
              tone: n.type === "order.cancelled" ? "danger" : "info",
            });
          }
        } else {
          for (const n of res.items) {
            if (!n.read_at) seenIds.current.add(n._id);
          }
        }
        firstLoadDone.current = true;
      } catch {
        /* swallow — bell is best-effort */
      }
    },
    [toast],
  );

  React.useEffect(() => {
    if (!user) return;
    setLoading(true);
    void reload(false).finally(() => setLoading(false));
    const id = window.setInterval(() => {
      void reload(true);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [user, reload]);

  async function markRead(id: string) {
    try {
      await apiPost(`/api/notifications/${id}/read`, {});
      await reload(false);
    } catch {
      /* ignore */
    }
  }

  async function markAllRead() {
    try {
      await apiPost(`/api/notifications/read-all`, {});
      await reload(false);
    } catch {
      /* ignore */
    }
  }

  if (!user) return null;

  const unread = feed?.unread_count ?? 0;
  const items = feed?.items ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Notifications"
          className="relative"
        >
          <Bell />
          {unread > 0 ? (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center",
                "rounded-full bg-[hsl(var(--destructive))] px-1 text-[10px] font-semibold text-white",
                "shadow-[0_0_0_2px_hsl(var(--background))]",
              )}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[360px] max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3">
          <div>
            <div className="text-[13px] font-semibold tracking-[-0.005em]">
              Notifications
            </div>
            <p className="text-[11.5px] text-[hsl(var(--muted-foreground))]">
              {unread > 0
                ? `${unread} unread`
                : "You're all caught up."}
            </p>
          </div>
          {unread > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void markAllRead()}
            >
              <CheckCheck />
              Mark all
            </Button>
          ) : null}
        </div>

        {loading && !feed ? (
          <div className="px-4 py-6 text-center text-[12.5px] text-[hsl(var(--muted-foreground))]">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Inbox className="mx-auto mb-2 size-5 text-[hsl(var(--muted-foreground))]" />
            <p className="text-[12.5px] text-[hsl(var(--muted-foreground))]">
              No notifications yet.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[420px]">
            <ul className="divide-y divide-[hsl(var(--border))]">
              {items.map((n) => {
                const unreadRow = !n.read_at;
                const href = n.order_id ? `/pos/orders/${n.order_id}` : null;
                const Wrapper = href
                  ? (props: { children: React.ReactNode }) => (
                      <Link
                        href={href}
                        className="block"
                        onClick={() => {
                          void markRead(n._id);
                          setOpen(false);
                        }}
                      >
                        {props.children}
                      </Link>
                    )
                  : (props: { children: React.ReactNode }) => (
                      <div
                        className="cursor-pointer"
                        onClick={() => void markRead(n._id)}
                      >
                        {props.children}
                      </div>
                    );

                return (
                  <li key={n._id}>
                    <Wrapper>
                      <div
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 transition-colors",
                          "hover:bg-[hsl(var(--accent))]",
                          unreadRow && "bg-[hsl(var(--primary)/0.05)]",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "mt-1 size-2 shrink-0 rounded-full",
                            unreadRow
                              ? "bg-[hsl(var(--primary))]"
                              : "bg-transparent",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="truncate text-[13px] font-medium tracking-[-0.005em]">
                              {n.title}
                            </div>
                            <div className="shrink-0 text-[11px] text-[hsl(var(--muted-foreground))]">
                              {formatRelative(n.created_at)}
                            </div>
                          </div>
                          {n.body ? (
                            <p className="mt-0.5 text-[12px] text-[hsl(var(--muted-foreground))]">
                              {n.body}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </Wrapper>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
