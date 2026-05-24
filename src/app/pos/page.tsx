import Link from "next/link";
import { ArrowRight, ChevronRight, ClipboardList, Plus } from "lucide-react";

import { PageHeader } from "@/components/pages/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PosHome() {
  return (
    <div className="grid gap-10">
      <PageHeader
        eyebrow="Point of sale"
        title="A calm, fast register."
        description="Dine-in and takeaway — one keystroke from order to receipt. Built for clarity at the counter and at the bar."
        right={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/pos/orders">
                <ClipboardList />
                Open orders
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/pos/place-order">
                <Plus />
                New order
              </Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        <Card className="overflow-hidden">
          <div className="relative isolate">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(120% 100% at 8% 0%, hsl(var(--primary) / 0.10), transparent 55%)",
              }}
            />
            <CardContent className="grid gap-7 py-8 sm:py-10">
              <div className="grid gap-2">
                <Badge variant="primary" dot className="w-fit">
                  Quick start
                </Badge>
                <h2 className="font-display text-[26px] leading-[1.15] tracking-[-0.018em] sm:text-[30px]">
                  Take an order in three motions.
                </h2>
                <p className="max-w-[52ch] text-[13.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                  Pick the order type, add items from a tap-friendly grid, then
                  settle the bill with the method you prefer.
                </p>
              </div>

              <ol className="grid gap-3 sm:grid-cols-3">
                {STEPS.map((s, i) => (
                  <li
                    key={s.title}
                    className="group rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4"
                  >
                    <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                      <span className="grid size-5 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[10.5px] font-semibold text-[hsl(var(--foreground))]">
                        {i + 1}
                      </span>
                      <span className="text-eyebrow">{s.eyebrow}</span>
                    </div>
                    <div className="mt-2 text-[14px] font-semibold tracking-[-0.005em] text-[hsl(var(--foreground))]">
                      {s.title}
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                      {s.detail}
                    </p>
                  </li>
                ))}
              </ol>

              <div>
                <Button asChild size="lg" className="group">
                  <Link href="/pos/place-order">
                    Start a new order
                    <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </div>
        </Card>

        <div className="grid gap-4 content-start">
          <div>
            <div className="text-eyebrow mb-3">Today at a glance</div>
            <Card>
              <CardContent className="grid divide-y divide-[hsl(var(--border))] p-0">
                {METRICS.map((m) => (
                  <div
                    key={m.label}
                    className="flex items-baseline justify-between gap-3 px-5 py-3.5"
                  >
                    <span className="text-[12.5px] text-[hsl(var(--muted-foreground))]">
                      {m.label}
                    </span>
                    <span
                      className={`font-display text-[20px] tabular-nums tracking-[-0.01em] ${
                        m.tone === "primary"
                          ? "text-[hsl(var(--primary))]"
                          : "text-[hsl(var(--foreground))]"
                      }`}
                    >
                      {m.value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div>
            <div className="text-eyebrow mb-3">Shortcuts</div>
            <Card>
              <CardContent className="grid gap-1 p-2">
                {SHORTCUTS.map((sc) => (
                  <Link
                    key={sc.href}
                    href={sc.href}
                    className="group flex items-center justify-between gap-3 rounded-[8px] px-3 py-2.5 transition-colors hover:bg-[hsl(var(--accent))]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium tracking-[-0.005em]">
                        {sc.title}
                      </div>
                      <div className="truncate text-[11.5px] text-[hsl(var(--muted-foreground))]">
                        {sc.hint}
                      </div>
                    </div>
                    <ChevronRight className="size-3.5 shrink-0 text-[hsl(var(--muted-foreground))] transition-transform duration-150 group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

const STEPS = [
  {
    eyebrow: "Step one",
    title: "Choose type",
    detail: "Dine-in or takeaway — keyboard shortcut ready.",
  },
  {
    eyebrow: "Step two",
    title: "Add items",
    detail: "Searchable grid with modifiers and live availability.",
  },
  {
    eyebrow: "Step three",
    title: "Settle bill",
    detail: "Discounts, taxes, split — cash, card, or online.",
  },
] as const;

const METRICS = [
  { label: "Revenue", value: "PKR 214,500", tone: "primary" as const },
  { label: "Orders", value: "128", tone: "default" as const },
  { label: "Open tables", value: "12", tone: "default" as const },
  { label: "Kitchen load", value: "High", tone: "default" as const },
] as const;

const SHORTCUTS = [
  { title: "Kitchen display", hint: "Pending → preparing → ready", href: "/pos/kitchen" },
  { title: "Menu & categories", hint: "Manage items, prices and stock", href: "/pos/menu" },
  { title: "Payments", hint: "Methods, references and status", href: "/pos/payments" },
  { title: "Reports", hint: "Today's revenue and staff stats", href: "/pos/reports" },
] as const;
