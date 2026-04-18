import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { exchangeCodeForTokens, isGoogleConfigured } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com";

  if (!isGoogleConfigured()) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?google=unconfigured`);
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state"); // agent id
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?google=error`);
  }

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?google=token_exchange_failed`);
  }

  const expiresAt = new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString();

  const db = getAdminClient();
  const { error: updateErr } = await db
    .from("agent_profiles")
    .update({
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token || null,
      google_calendar_id: "primary",
      google_token_expires_at: expiresAt,
    })
    .eq("id", state);

  if (updateErr) {
    console.error("Google token save failed:", updateErr);
    return NextResponse.redirect(`${appUrl}/dashboard/settings?google=save_failed`);
  }

  return NextResponse.redirect(`${appUrl}/dashboard/settings?google=connected`);
}
