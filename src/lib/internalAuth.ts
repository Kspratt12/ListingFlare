import { createHash, timingSafeEqual } from "crypto";

// Anything with a headers.get(name) - a NextRequest or a test double.
type HeaderReader = { headers: { get(name: string): string | null } };

// Some API routes are only meant to be called by other routes on this server
// (lead created -> notify -> auto-reply / follow-up schedule), and the cron jobs
// are only meant to be called by Vercel Cron or by those routes. Both carry
// CRON_SECRET, so a stranger who learns a lead or listing id can't trigger
// emails or AI calls through them.
//
// FAIL CLOSED: if CRON_SECRET is missing or empty, every check below denies.
// There is no development bypass. For local work, set CRON_SECRET to a local
// throwaway value and send it.
export const INTERNAL_HEADER = "x-internal-secret";

export function internalHeaders(): Record<string, string> {
  const secret = process.env.CRON_SECRET;
  return secret ? { [INTERNAL_HEADER]: secret } : {};
}

// Constant-time comparison. Both sides are hashed first so the comparison runs
// on equal-length buffers and the length of the real secret is not revealed.
export function secretsMatch(
  provided: string | null | undefined,
  expected: string | null | undefined
): boolean {
  if (!expected || !provided) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

// Server-to-server calls between this app's own routes.
export function isInternalCall(req: HeaderReader): boolean {
  return secretsMatch(req.headers.get(INTERNAL_HEADER), process.env.CRON_SECRET);
}

// Vercel Cron (and the daily job's chained calls) send "Authorization: Bearer <CRON_SECRET>".
export function isCronAuthorized(req: HeaderReader): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return false;
  return secretsMatch(header.slice("Bearer ".length), secret);
}
