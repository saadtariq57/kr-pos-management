"use client";

import * as React from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  loadStripe,
  type Appearance,
  type Stripe as StripeJs,
} from "@stripe/stripe-js";
import { AlertCircle, CreditCard, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api-client";

// Lazy singleton — created once on the client. Null when the publishable key
// is missing so we can show a clear "not configured" message.
let stripePromise: Promise<StripeJs | null> | null = null;
function getStripePromise(): Promise<StripeJs | null> | null {
  if (stripePromise) return stripePromise;
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!pk) return null;
  // `developerTools.assistant.enabled: false` hides Stripe's test-mode
  // "testing assistant" popup that otherwise floats in the bottom-right.
  stripePromise = loadStripe(pk, {
    developerTools: { assistant: { enabled: false } },
  });
  return stripePromise;
}

// Stripe Elements appearance tuned to the app's dark / amber theme.
const appearance: Appearance = {
  theme: "night",
  variables: {
    colorPrimary: "hsl(42, 88%, 60%)",
    colorBackground: "hsl(240, 6%, 6%)",
    colorText: "hsl(40, 12%, 94%)",
    colorTextSecondary: "hsl(240, 5%, 60%)",
    colorDanger: "hsl(4, 70%, 56%)",
    // Stripe renders inside a cross-origin iframe where the app's CSS
    // variables (e.g. --font-geist-sans) don't exist, so we must give a
    // concrete font stack — otherwise it falls back to a serif (Times).
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    borderRadius: "10px",
    fontSizeBase: "14px",
  },
  rules: {
    ".Input": {
      backgroundColor: "hsl(240, 6%, 6%)",
      border: "1px solid hsl(240, 5%, 14%)",
      boxShadow: "inset 0 1px 0 hsl(40 12% 94% / 0.03)",
    },
    ".Input:focus": {
      border: "1px solid hsl(42 88% 60% / 0.6)",
      boxShadow: "0 0 0 3px hsl(42 88% 60% / 0.18)",
    },
    ".Label": {
      color: "hsl(240, 5%, 60%)",
      fontWeight: "500",
    },
  },
};

function CheckoutForm({
  amountLabel,
  onPaid,
}: {
  amountLabel: string;
  onPaid: (transactionReference: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [error, setError] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || processing) return;
    setError(null);
    setProcessing(true);
    try {
      const result = await stripe.confirmPayment({
        elements,
        // POS flow — stay on the page; we never want a redirect.
        redirect: "if_required",
      });

      if (result.error) {
        setError(result.error.message ?? "Your card could not be charged.");
        return;
      }

      const pi = result.paymentIntent;
      if (pi && pi.status === "succeeded") {
        onPaid(pi.id);
        return;
      }
      setError(
        `Payment did not complete (status: ${pi?.status ?? "unknown"}).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Card payment failed.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <PaymentElement
        onReady={() => setReady(true)}
        options={{ layout: "tabs" }}
      />

      {error ? (
        <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || !ready || processing}
      >
        <Lock />
        {processing ? "Processing…" : `Pay ${amountLabel}`}
      </Button>

      <p className="flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
        <Lock className="size-3" />
        Secured by Stripe · Test mode — no real charge is made.
      </p>
    </form>
  );
}

/**
 * Card payment via Stripe's own Payment Element. We first create a
 * PaymentIntent on the server to obtain a client secret, then mount Stripe's
 * hosted card UI bound to it. Confirmation happens in-browser through Stripe.
 */
export function StripeCardForm({
  orderId,
  amountLabel,
  onPaid,
}: {
  orderId: string;
  amountLabel: string;
  onPaid: (transactionReference: string) => void;
}) {
  const [promise] = React.useState(() => getStripePromise());
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!promise) return;
    let cancelled = false;
    setLoadError(null);
    setClientSecret(null);
    apiPost<{ client_secret: string }>(
      `/api/orders/${orderId}/payment/intent`,
      {},
    )
      .then((res) => {
        if (!cancelled) setClientSecret(res.client_secret);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "Could not start card payment.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, promise]);

  if (!promise) {
    return (
      <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Card payments are unavailable: set{" "}
          <span className="font-mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</span>{" "}
          in your <span className="font-mono">.env</span> and restart the dev
          server.
        </span>
      </div>
    );
  }

  return (
    <div className="grid max-w-md gap-4 rounded-[14px] border border-[hsl(var(--border))] bg-gradient-to-b from-[hsl(var(--card))] to-[hsl(var(--background))] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-[hsl(var(--primary))]" />
          <span className="text-[13px] font-semibold tracking-[-0.005em]">
            Pay with card
          </span>
        </div>
        <span className="font-display text-[18px] tabular-nums tracking-[-0.01em] text-[hsl(var(--primary))]">
          {amountLabel}
        </span>
      </div>

      {loadError ? (
        <div className="flex items-start gap-2 rounded-[10px] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2.5 text-[12.5px] text-[hsl(var(--destructive))]">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>{loadError}</span>
        </div>
      ) : clientSecret ? (
        <Elements
          stripe={promise}
          options={{ clientSecret, appearance }}
          key={clientSecret}
        >
          <CheckoutForm amountLabel={amountLabel} onPaid={onPaid} />
        </Elements>
      ) : (
        <div className="grid gap-2">
          <div className="h-10 animate-pulse rounded-[10px] bg-[hsl(var(--muted))]" />
          <div className="h-10 animate-pulse rounded-[10px] bg-[hsl(var(--muted))]" />
          <div className="h-9 animate-pulse rounded-[10px] bg-[hsl(var(--muted))]" />
        </div>
      )}
    </div>
  );
}
