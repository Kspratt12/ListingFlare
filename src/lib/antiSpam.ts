import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Minimum time a human takes to fill out the form.
// Anything faster than this is almost certainly a bot.
const MIN_FILL_MS = 1500;

// How recently we consider a duplicate submission "too fresh"
const DUPLICATE_WINDOW_MS = 30_000;

// Sliding abuse window
const ABUSE_WINDOW_MS = 10 * 60_000;
const MAX_LEADS_PER_LISTING_PER_WINDOW = 15;
const MAX_LEADS_PER_EMAIL_PER_WINDOW = 4;

export interface SpamCheckInput {
  honeypot?: unknown;
  formStartedAt?: number;
  listingId: string;
  email: string;
}

export interface SpamCheckResult {
  ok: boolean;
  reason?: string;
}

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// Cheap checks that don't hit the DB
export function checkHoneypotAndTiming(input: SpamCheckInput): SpamCheckResult {
  // Honeypot: legitimate forms leave this field empty
  if (typeof input.honeypot === "string" && input.honeypot.trim().length > 0) {
    return { ok: false, reason: "Spam detected" };
  }

  // Timing: if client sent formStartedAt and it's suspiciously fast, block
  if (typeof input.formStartedAt === "number" && input.formStartedAt > 0) {
    const elapsed = Date.now() - input.formStartedAt;
    if (elapsed < MIN_FILL_MS) {
      return { ok: false, reason: "Submitted too fast" };
    }
  }

  return { ok: true };
}

// DB-backed rate limits. Uses the existing leads table, no new columns needed.
export async function checkRateLimits(
  db: SupabaseClient,
  input: SpamCheckInput
): Promise<SpamCheckResult> {
  const abuseCutoff = new Date(Date.now() - ABUSE_WINDOW_MS).toISOString();

  // Too many leads to this listing in the last 10 min = somebody's hammering it
  const { count: perListingCount } = await db
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", input.listingId)
    .gte("created_at", abuseCutoff);

  if ((perListingCount || 0) >= MAX_LEADS_PER_LISTING_PER_WINDOW) {
    return { ok: false, reason: "Too many submissions. Please try again later." };
  }

  // Too many leads from this same email across all listings = scripted attack
  const { count: perEmailCount } = await db
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("email", input.email.toLowerCase())
    .gte("created_at", abuseCutoff);

  if ((perEmailCount || 0) >= MAX_LEADS_PER_EMAIL_PER_WINDOW) {
    return { ok: false, reason: "Too many submissions from this address." };
  }

  return { ok: true };
}

export { DUPLICATE_WINDOW_MS };
