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

// GET /api/leads/documents?leadId=... - list docs for a lead
export async function GET(req: NextRequest) {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const leadId = req.nextUrl.searchParams.get("leadId");
    if (!leadId) return NextResponse.json({ error: "Missing leadId" }, { status: 400 });

    const db = getAdminClient();

    // Verify agent owns the lead
    const { data: lead } = await db
      .from("leads")
      .select("agent_id")
      .eq("id", leadId)
      .single();
    if (!lead || lead.agent_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: docs } = await db
      .from("lead_documents")
      .select("id, storage_path, file_name, file_size, mime_type, category, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ ok: true, documents: docs || [] });
  } catch (err) {
    console.error("List docs error:", err);
    return NextResponse.json({ error: "Failed to list" }, { status: 500 });
  }
}

// POST /api/leads/documents - save metadata after client-side upload
// Body: { leadId, storagePath, fileName, fileSize, mimeType, category }
export async function POST(req: NextRequest) {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { leadId, storagePath, fileName, fileSize, mimeType, category } = body;

    if (!leadId || !storagePath || !fileName || fileSize == null) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (typeof fileSize !== "number" || fileSize <= 0 || fileSize > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "Invalid file size (max 50 MB)" }, { status: 400 });
    }

    // Validate category
    const validCategories = ["contract", "inspection", "financing", "disclosure", "other"];
    const safeCategory = validCategories.includes(category) ? category : "other";

    const db = getAdminClient();

    // Verify agent owns the lead
    const { data: lead } = await db
      .from("leads")
      .select("agent_id")
      .eq("id", leadId)
      .single();
    if (!lead || lead.agent_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // The storage path must belong to this agent's folder (additional defense)
    if (!String(storagePath).startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
    }

    const { data: newDoc, error } = await db
      .from("lead_documents")
      .insert({
        lead_id: leadId,
        agent_id: user.id,
        storage_path: storagePath,
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType || null,
        category: safeCategory,
      })
      .select("id, storage_path, file_name, file_size, mime_type, category, created_at")
      .single();

    if (error || !newDoc) {
      console.error("Save doc error:", error);
      return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, document: newDoc });
  } catch (err) {
    console.error("Create doc error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/leads/documents?id=... - remove a document (metadata + storage)
export async function DELETE(req: NextRequest) {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const db = getAdminClient();
    const { data: doc } = await db
      .from("lead_documents")
      .select("id, storage_path, agent_id")
      .eq("id", id)
      .single();

    if (!doc || doc.agent_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Remove file from storage, then metadata
    await db.storage.from("lead-documents").remove([doc.storage_path]);
    await db.from("lead_documents").delete().eq("id", id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete doc error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
