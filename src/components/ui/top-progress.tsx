"use client";

import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";
import NProgress from "nprogress";

/**
 * App-wide top loading bar.
 *
 * Triggers on:
 *   1. Client navigation — intercepts left-clicks on internal links and runs
 *      `done()` once the new pathname/searchParams render.
 *   2. API calls — `api-client.ts` lazily imports {@link startTopProgress} and
 *      {@link doneTopProgress} around every fetch.
 *
 * The bar's visual style (color, height, glow) is themed in
 * `src/app/globals.css` under `#nprogress` so we don't have to ship the
 * package's default CSS.
 */

let configured = false;
function ensureConfigured() {
  if (configured) return;
  configured = true;
  NProgress.configure({
    showSpinner: false,
    trickleSpeed: 180,
    minimum: 0.1,
    easing: "ease",
    speed: 320,
  });
}

let pendingCount = 0;
export function startTopProgress() {
  ensureConfigured();
  pendingCount += 1;
  if (pendingCount === 1) {
    NProgress.start();
  } else {
    NProgress.inc(0.08);
  }
}
export function doneTopProgress() {
  ensureConfigured();
  pendingCount = Math.max(0, pendingCount - 1);
  if (pendingCount === 0) {
    NProgress.done();
  }
}

export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    ensureConfigured();
  }, []);

  React.useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#")) return;
      if (href.startsWith("mailto:") || href.startsWith("tel:")) return;

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
      } catch {
        return;
      }

      NProgress.start();
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
