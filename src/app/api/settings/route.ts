import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Admin client bypasses RLS — safe here because we verify auth first
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PUT(req: NextRequest) {
  try {
    // Step 1: Verify the user is authenticated via session cookies
    const authClient = createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated. Please sign out and sign back in." }, { status: 401 });
    }

    const body = await req.json();
    const {
      name, title, brokerage, phone, email,
      headshot_url, instagram, linkedin, zillow,
      realtor_com, facebook, website, weekly_emails,
      calendly_url,
    } = body;

    // Step 2: Use admin client to bypass RLS and guarantee the update works
    const db = getAdminClient();

    const profileData: Record<string, unknown> = {
      name: name || "",
      title: title || "Real Estate Agent",
      brokerage: brokerage || "",
      phone: phone || "",
      email: email || "",
      headshot_url: headshot_url || null,
      instagram: instagram || "",
      linkedin: linkedin || "",
      zillow: zillow || "",
      realtor_com: realtor_com || "",
      facebook: facebook || "",
      website: website || "",
      weekly_emails: weekly_emails !== false,
      calendly_url: calendly_url || "",
      updated_at: new Date().toISOString(),
    };

    // Try update with all fields
    let { error: updateError } = await db
      .from("agent_profiles")
      .update(profileData)
      .eq("id", user.id);

    if (updateError) {
      // Retry without calendly_url in case column doesn't exist yet
      delete profileData.calendly_url;
      const { error: retryError } = await db
        .from("agent_profiles")
        .update(profileData)
        .eq("id", user.id);
      if (retryError) {
        updateError = retryError;
      } else {
        updateError = null;
      }
    }

    if (updateError) {
      console.error("Settings update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Step 3: Verify the save took effect
    const { data: verify } = await db
      .from("agent_profiles")
      .select("email, name, phone")
      .eq("id", user.id)
      .single();

    if (!verify) {
      return NextResponse.json({ error: "Profile not found after save" }, { status: 500 });
    }

    if (verify.email !== (email || "")) {
      return NextResponse.json(
        { error: "Save failed — database did not accept the changes" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, profile: verify });
  } catch (err) {
    console.error("Settings save error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
