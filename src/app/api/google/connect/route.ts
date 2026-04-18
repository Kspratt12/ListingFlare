import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildAuthUrl, isGoogleConfigured } from "@/lib/google/oauth";

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

  // state = agent id so callback knows who to associate tokens with
  const authUrl = buildAuthUrl(user.id);
  return NextResponse.redirect(authUrl);
}
