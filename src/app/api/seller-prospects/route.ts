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

const VALID_SOURCES = ["referral", "door_knock", "expired_listing", "farming", "open_house", "past_client", "online", "other"];
const VALID_STAGES = ["prospect", "met", "presentation", "listed", "sold", "dropped"];

// GET /api/seller-prospects - list all prospects for the authenticated agent
export async function GET() {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getAdminClient();
    const { data, error } = await db
      .from("seller_prospects")
      .select("*")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to load" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, prospects: data || [] });
  } catch (err) {
    console.error("List prospects error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/seller-prospects - create a new prospect
export async function POST(req: NextRequest) {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, street, city, state, zip, phone, email, source, stage, estimated_value, notes, follow_up_date } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const safeSource = VALID_SOURCES.includes(source) ? source : "other";
    const safeStage = VALID_STAGES.includes(stage) ? stage : "prospect";

    const db = getAdminClient();
    const { data, error } = await db
      .from("seller_prospects")
      .insert({
        agent_id: user.id,
        name: name.trim(),
        street: street?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        zip: zip?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        source: safeSource,
        stage: safeStage,
        estimated_value: typeof estimated_value === "number" ? estimated_value : null,
        notes: notes?.trim() || null,
        follow_up_date: follow_up_date || null,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Create prospect error:", error);
      return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, prospect: data });
  } catch (err) {
    console.error("Create prospect error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
