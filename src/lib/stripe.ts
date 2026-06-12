import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Returns a singleton Stripe client configured from STRIPE_SECRET_KEY.
 *
 * We intentionally read the key lazily (instead of at module load) so the
 * rest of the app keeps booting even when Stripe isn't configured yet — only
 * the card-payment endpoints fail, and they fail with a clear message.
 */
export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in your .env (use your test-mode secret key).",
    );
  }
  client = new Stripe(key);
  return client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Presentment currency for card charges. Lower-cased ISO code (e.g. "pkr").
 */
export function getStripeCurrency(): string {
  return (process.env.STRIPE_CURRENCY || "pkr").toLowerCase();
}

// Stripe expects amounts in the currency's smallest unit. Most currencies use
// 2 decimal places (multiply by 100); a handful are zero-decimal and take the
// integer amount as-is. PKR is a 2-decimal currency.
const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

/**
 * Convert a human amount (e.g. 1499.50 PKR) into the integer Stripe expects.
 */
export function toStripeAmount(amount: number, currency: string): number {
  const cur = currency.toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(cur)) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}
