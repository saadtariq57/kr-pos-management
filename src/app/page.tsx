import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { getSessionUserAny } from "@/lib/auth-server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const session = await getSessionUserAny();
  if (session) {
    redirect("/pos");
  }

  return (
    <div
      className={cn(
        "relative isolate min-h-dvh overflow-x-hidden",
        "bg-[hsl(var(--background))] text-[hsl(var(--foreground))]",
      )}
    >
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute -top-1/3 left-1/2 size-[760px] -translate-x-1/2 rounded-full opacity-[0.55] blur-[120px]"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.18), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 opacity-[0.22] grain" />
      </div>

      <div className="relative flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-6 py-6 sm:px-10">
          <BrandMark />
          <Link
            href="/login"
            className={cn(
              "text-[12.5px] font-medium text-[hsl(var(--muted-foreground))]",
              "transition-colors hover:text-[hsl(var(--foreground))]",
            )}
          >
            Sign in
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 pb-20 pt-8 sm:px-10">
          <div className="w-full max-w-[520px] text-center animate-kr-fade-in">
            <div className="text-eyebrow">KR Restaurant</div>

            <h1
              className={cn(
                "mt-5 font-display",
                "text-[40px] leading-[1.05] tracking-[-0.022em]",
                "sm:text-[52px]",
              )}
            >
              Quiet software
              <br />
              for a busy floor.
            </h1>

            <p className="mx-auto mt-5 max-w-[40ch] text-[14px] leading-relaxed text-[hsl(var(--muted-foreground))]">
              A point-of-sale and management workspace for KR Restaurant — orders,
              menu, payments, and the kitchen, in one calm interface.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/signup">
                  Create an account
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                <Link href="/login">I already have one</Link>
              </Button>
            </div>

            <div className="mt-10 flex items-center justify-center gap-2 text-[11.5px] text-[hsl(var(--muted-foreground))]">
              <span
                aria-hidden
                className="size-1 rounded-full bg-[hsl(var(--primary))]"
              />
              <span className="tracking-[0.08em]">
                Built for staff, designed for the counter.
              </span>
            </div>
          </div>
        </main>

        <footer className="px-6 pb-6 sm:px-10">
          <div
            className={cn(
              "mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-2",
              "border-t border-[hsl(var(--border))] pt-5",
              "text-[11.5px] text-[hsl(var(--muted-foreground))]",
              "sm:flex-row",
            )}
          >
            <span>© {new Date().getFullYear()} KR Restaurant</span>
            <span className="tracking-[0.08em]">POS &amp; Management</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
