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

// PATCH /api/seller-prospects/[id] - update a prospect
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    // Whitelist updatable fields
    if (typeof body.name === "string" && body.name.trim().length > 0) updates.name = body.name.trim();
    if ("street" in body) updates.street = body.street?.trim() || null;
    if ("city" in body) updates.city = body.city?.trim() || null;
    if ("state" in body) updates.state = body.state?.trim() || null;
    if ("zip" in body) updates.zip = body.zip?.trim() || null;
    if ("phone" in body) updates.phone = body.phone?.trim() || null;
    if ("email" in body) updates.email = body.email?.trim() || null;
    if (typeof body.source === "string" && VALID_SOURCES.includes(body.source)) updates.source = body.source;
    if (typeof body.stage === "string" && VALID_STAGES.includes(body.stage)) updates.stage = body.stage;
    if ("estimated_value" in body) {
      updates.estimated_value = typeof body.estimated_value === "number" ? body.estimated_value : null;
    }
    if ("notes" in body) updates.notes = body.notes?.trim() || null;
    if ("follow_up_date" in body) updates.follow_up_date = body.follow_up_date || null;
    if (body.markContacted === true) updates.last_contacted_at = new Date().toISOString();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const db = getAdminClient();
    const { data, error } = await db
      .from("seller_prospects")
      .update(updates)
      .eq("id", params.id)
      .eq("agent_id", user.id)
      .select()
      .single();

    if (error || !data) {
      console.error("Update prospect error:", error);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, prospect: data });
  } catch (err) {
    console.error("Update prospect error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/seller-prospects/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getAdminClient();
    const { error } = await db
      .from("seller_prospects")
      .delete()
      .eq("id", params.id)
      .eq("agent_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete prospect error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
