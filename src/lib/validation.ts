/** Shared input validation helpers used on both the client and API routes. */

/**
 * Validates a phone number loosely enough to allow common local and
 * international formats (e.g. `03xx-xxxxxxx`, `+92 3xx xxxxxxx`) while
 * rejecting obviously bad input. Only digits, spaces, dashes, parentheses
 * and a single leading `+` are allowed, and the digit count must land in a
 * sensible range.
 */
export function isValidPhone(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (!/^\+?[0-9\s\-()]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export const PHONE_HINT =
  "Enter a valid phone number (10–15 digits, e.g. 03xx-xxxxxxx).";
