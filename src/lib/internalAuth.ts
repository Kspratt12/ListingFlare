import type { NextRequest } from "next/server";

// Some API routes are only meant to be called by other routes on this server
// (lead created -> notify -> auto-reply / follow-up schedule). They carry the
// same secret the cron jobs use, so a stranger who learns a lead or listing id
// can't trigger emails or AI calls through them.
export const INTERNAL_HEADER = "x-internal-secret";

export function internalHeaders(): Record<string, string> {
  const secret = process.env.CRON_SECRET;
  return secret ? { [INTERNAL_HEADER]: secret } : {};
}

// If CRON_SECRET is not configured we keep the old open behaviour instead of
// silently breaking lead notifications. Set CRON_SECRET in production.
export function isInternalCall(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get(INTERNAL_HEADER) === secret;
}
