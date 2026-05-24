import "server-only";

import crypto from "node:crypto";
import sgMail, { type MailDataRequired } from "@sendgrid/mail";

import {
  renderVerifyEmail,
  type RenderedEmail,
} from "@/lib/email-templates/verify-email";

/* ────────────────────────────────────────────────────────────────────────── */
/* Configuration                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY ?? "";
const FROM_EMAIL =
  process.env.SENDGRID_FROM_EMAIL ??
  process.env.EMAIL_FROM ??
  "saadtariqslayer@gmail.com";
const FROM_NAME = process.env.SENDGRID_FROM_NAME ?? "KR Restaurant";
const REPLY_TO_EMAIL = process.env.SENDGRID_REPLY_TO ?? FROM_EMAIL;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? FROM_EMAIL;

// SendGrid expects the API key to start with "SG." — strip stray quoting and
// trim whitespace defensively, since copy/paste from dashboards is common.
const cleanedKey = SENDGRID_API_KEY.trim().replace(/^['"]|['"]$/g, "");
let sendgridReady = false;
if (cleanedKey) {
  sgMail.setApiKey(cleanedKey);
  sendgridReady = true;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* URLs / token helpers                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

/** Public origin used in email links. Falls back to localhost in dev. */
export function getAppUrl(): string {
  const url =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

export function generateEmailVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getVerificationExpiry(hours = 24): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function buildVerifyEmailUrl(token: string): string {
  return `${getAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Sender                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

export type SendEmailResult =
  | { ok: true; skipped?: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

async function sendEmail(
  to: string,
  rendered: RenderedEmail,
): Promise<SendEmailResult> {
  if (!sendgridReady) {
    console.warn(
      "[email] SENDGRID_API_KEY missing — email send skipped:",
      rendered.subject,
    );
    return { ok: true, skipped: true, reason: "SENDGRID_API_KEY missing" };
  }

  const msg: MailDataRequired = {
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    replyTo: REPLY_TO_EMAIL,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
      openTracking: { enable: false },
    },
    mailSettings: {
      sandboxMode: { enable: false },
    },
  };

  try {
    await sgMail.send(msg);
    return { ok: true };
  } catch (e: unknown) {
    const error = extractSendgridError(e);
    console.error("[email] SendGrid send failed:", error);
    return { ok: false, error };
  }
}

function extractSendgridError(e: unknown): string {
  if (e && typeof e === "object") {
    const anyErr = e as {
      message?: string;
      response?: { body?: { errors?: Array<{ message?: string }> } };
    };
    const apiErrors = anyErr.response?.body?.errors;
    if (apiErrors && apiErrors.length > 0) {
      return apiErrors
        .map((er) => er.message ?? "")
        .filter(Boolean)
        .join("; ");
    }
    if (anyErr.message) return anyErr.message;
  }
  return "Unknown SendGrid error";
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Public: verification email                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

export async function sendVerificationEmail(params: {
  to: string;
  name: string;
  token: string;
  expiresInHours?: number;
}): Promise<SendEmailResult> {
  const appUrl = getAppUrl();
  const verifyUrl = buildVerifyEmailUrl(params.token);
  const logoUrl = `${appUrl}/logo.jpeg`;

  const rendered = renderVerifyEmail({
    name: params.name,
    verifyUrl,
    logoUrl,
    appUrl,
    expiresInHours: params.expiresInHours ?? 24,
    supportEmail: SUPPORT_EMAIL,
  });

  return sendEmail(params.to, rendered);
}
