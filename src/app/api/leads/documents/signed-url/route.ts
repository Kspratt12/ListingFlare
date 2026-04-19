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

// GET /api/leads/documents/signed-url?id=... - returns a short-lived signed
// URL so the agent can view/download a document. Never expose raw storage
// paths or public URLs - each access goes through this check.
export async function GET(req: NextRequest) {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const db = getAdminClient();
    const { data: doc } = await db
      .from("lead_documents")
      .select("storage_path, agent_id, file_name")
      .eq("id", id)
      .single();

    if (!doc || doc.agent_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 5 minute expiry - plenty for viewing, limits window if URL leaks
    const { data: signed } = await db.storage
      .from("lead-documents")
      .createSignedUrl(doc.storage_path, 300);

    if (!signed?.signedUrl) {
      return NextResponse.json({ error: "Could not create signed URL" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      url: signed.signedUrl,
      fileName: doc.file_name,
    });
  } catch (err) {
    console.error("Signed URL error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
