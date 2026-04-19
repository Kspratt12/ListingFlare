import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 300; // cache for 5 minutes

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Simple in-memory rate limit per IP. Allows 30 requests per 5 minutes per IP.
// Good enough for a small abuse prevention on this public endpoint.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS = 30;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  if (entry.count > MAX_REQUESTS) return true;
  return false;
}

// Simple cache to avoid hitting the DB on every request
let cached: { data: { leads: number; showings: number; listings: number }; at: number } | null = null;
const CACHE_TTL = 60 * 1000; // 60 seconds

export async function GET(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "300" } }
    );
  }

  // Serve cached value if fresh
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const db = getAdminClient();

    // Aggregate totals - safe, anonymous numbers only
    const [leadsResult, showingsResult, listingsResult] = await Promise.all([
      db.from("leads").select("id", { count: "exact", head: true }),
      db.from("showings").select("id", { count: "exact", head: true }),
      db
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
    ]);

    const data = {
      leads: leadsResult.count || 0,
      showings: showingsResult.count || 0,
      listings: listingsResult.count || 0,
    };

    cached = { data, at: Date.now() };
    return NextResponse.json(data);
  } catch (err) {
    console.error("Public stats error:", err);
    return NextResponse.json({ leads: 0, showings: 0, listings: 0 });
  }
}
