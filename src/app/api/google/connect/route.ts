import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildAuthUrl, isGoogleConfigured } from "@/lib/google/oauth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      { error: "Google integration not configured on this deployment" },
      { status: 503 }
    );
  }

  const authClient = createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com"}/login`
    );
  }

  // Generate a cryptographically random nonce, stash it in an HTTP-only cookie,
  // and use it as the OAuth `state`. Callback will verify they match and
  // derive the agent id from the authenticated session - never from the URL.
  const nonce = crypto.randomBytes(32).toString("hex");

  const cookieStore = cookies();
  cookieStore.set("google_oauth_state", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 minutes
  });

  const authUrl = buildAuthUrl(nonce);
  return NextResponse.redirect(authUrl);
}
