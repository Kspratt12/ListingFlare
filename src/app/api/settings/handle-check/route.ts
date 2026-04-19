import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;
const RESERVED = new Set([
  "www", "listingflare", "app", "api", "admin", "mail", "webmail", "ftp",
  "blog", "docs", "status", "help", "support", "about", "contact", "terms",
  "privacy", "login", "signup", "dashboard", "demo", "pricing", "home",
  "homes", "listing", "listings", "seller", "agent", "agents", "auth",
  "root", "test", "staging", "prod", "dev",
]);

// GET /api/settings/handle-check?handle=kelvin
// Returns { available: boolean, reason?: string } for the given handle.
export async function GET(req: NextRequest) {
  const authClient = createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = req.nextUrl.searchParams.get("handle") || "";
  const handle = raw.trim().toLowerCase();

  if (!handle) {
    return NextResponse.json({ available: false, reason: "Enter a handle" });
  }
  if (handle.length < 3) {
    return NextResponse.json({ available: false, reason: "Minimum 3 characters" });
  }
  if (handle.length > 32) {
    return NextResponse.json({ available: false, reason: "Maximum 32 characters" });
  }
  if (!HANDLE_PATTERN.test(handle)) {
    return NextResponse.json({
      available: false,
      reason: "Lowercase letters, numbers, and hyphens only (no hyphen at start/end)",
    });
  }
  if (RESERVED.has(handle)) {
    return NextResponse.json({ available: false, reason: "This handle is reserved" });
  }

  // Check if already taken by another agent
  const db = getAdminClient();
  const { data: existing } = await db
    .from("agent_profiles")
    .select("id")
    .ilike("handle", handle)
    .maybeSingle();

  if (existing && existing.id !== user.id) {
    return NextResponse.json({ available: false, reason: "Already taken" });
  }

  return NextResponse.json({ available: true });
}
