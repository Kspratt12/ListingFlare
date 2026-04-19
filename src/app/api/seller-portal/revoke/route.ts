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

export async function POST(req: NextRequest) {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { portalId } = await req.json();
    if (!portalId) {
      return NextResponse.json({ error: "Missing portalId" }, { status: 400 });
    }

    const db = getAdminClient();
    const { error } = await db
      .from("seller_portals")
      .update({ active: false })
      .eq("id", portalId)
      .eq("agent_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to revoke" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Revoke error:", err);
    return NextResponse.json({ error: "Failed to revoke" }, { status: 500 });
  }
}
