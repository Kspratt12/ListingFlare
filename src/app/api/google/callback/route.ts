import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?google=error`);
  }

  // Verify the state matches the nonce we set when the user started the flow.
  // This blocks CSRF where an attacker tries to bind their Google account to a
  // victim's row, or vice versa.
  const cookieStore = cookies();
  const expectedNonce = cookieStore.get("google_oauth_state")?.value;
  cookieStore.delete("google_oauth_state");

  if (!expectedNonce || expectedNonce !== state) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?google=state_mismatch`);
  }

  // Derive the agent id from the authenticated session, NOT from the URL.
  // Whoever is currently logged in is who the tokens get saved for.
  const authClient = createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`);
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
    .eq("id", user.id);

  if (updateErr) {
    console.error("Google token save failed:", updateErr);
    return NextResponse.redirect(`${appUrl}/dashboard/settings?google=save_failed`);
  }

  return NextResponse.redirect(`${appUrl}/dashboard/settings?google=connected`);
}
