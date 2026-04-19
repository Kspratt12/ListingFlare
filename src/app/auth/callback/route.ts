import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Only allow relative paths that stay on our domain. Blocks classic
// open-redirect payloads like //evil.com, /\evil.com, https://evil.com
function sanitizeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  // Must start with a single forward slash
  if (!raw.startsWith("/")) return "/dashboard";
  // Block protocol-relative (//host) and backslash tricks that some URL parsers treat as host-relative
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/dashboard";
  // Block anything that tries to sneak in a scheme or host
  if (/^\/[^/]*:/.test(raw)) return "/dashboard";
  return raw;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const next = sanitizeNext(searchParams.get("next"));

  if (code) {
    const supabase = createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com";
  return NextResponse.redirect(`${baseUrl}${next}`);
}
