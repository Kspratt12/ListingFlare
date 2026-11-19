import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { customDomainsConfigured, DOMAIN_STATE_LABELS } from "@/lib/customDomain";
import { createVercelProvider } from "@/lib/domainProvider";
import { connectDomain, errorMessage, recheckDomain, removeDomain, type DomainRow, type DomainStore } from "@/lib/customDomainService";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const COLUMNS = "id, agent_id, hostname, status, dns_records, last_error, last_checked_at, check_count, connected_at";

function supabaseStore(db: SupabaseClient): DomainStore {
  return {
    async current(agentId) {
      const { data, error } = await db.from("agent_custom_domains").select(COLUMNS).eq("agent_id", agentId).neq("status", "removed").maybeSingle();
      if (error) throw new Error("store_unavailable");
      return (data as DomainRow | null) ?? null;
    },
    async insert(agentId, hostname) {
      const { data, error } = await db.from("agent_custom_domains").insert({ agent_id: agentId, hostname, status: "pending" }).select(COLUMNS).single();
      if (error?.code === "23505") return "conflict";
      if (error || !data) throw new Error("store_unavailable");
      return data as DomainRow;
    },
    async ownerOf(hostname) {
      const { data } = await db.from("agent_custom_domains").select("agent_id").eq("hostname", hostname).neq("status", "removed").maybeSingle();
      return (data as { agent_id: string } | null)?.agent_id ?? null;
    },
    async update(id, patch) {
      const { data, error } = await db.from("agent_custom_domains").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).select(COLUMNS).single();
      if (error || !data) throw new Error("store_unavailable");
      return data as DomainRow;
    },
  };
}

function present(row: DomainRow | null) {
  if (!row) return null;
  return {
    hostname: row.hostname,
    status: row.status,
    statusLabel: DOMAIN_STATE_LABELS[row.status],
    records: row.dns_records || [],
    error: errorMessage(row.last_error),
    lastCheckedAt: row.last_checked_at,
    connectedAt: row.connected_at,
  };
}

async function context(req: NextRequest) {
  const { data: { user } } = await createServerSupabaseClient().auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const available = customDomainsConfigured();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  if (req.method !== "GET") {
    if (!available) return { error: NextResponse.json({ error: "Custom domains aren't available yet." }, { status: 503 }) };
    const limited = rateLimit({ key: `domains:${user.id}`, limit: 10, windowMs: 60_000 });
    if (!limited.ok) return { error: NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 }) };
  }
  return { user, db, available };
}

export async function GET(req: NextRequest) {
  const c = await context(req);
  if ("error" in c) return c.error;
  if (!c.available) return NextResponse.json({ available: false, domain: null });
  try {
    const row = await supabaseStore(c.db).current(c.user.id);
    return NextResponse.json({ available: true, domain: present(row) });
  } catch {
    return NextResponse.json({ error: "Custom domains need the latest database update (migration 046)." }, { status: 503 });
  }
}

async function act(req: NextRequest, run: (userId: string, store: DomainStore) => ReturnType<typeof connectDomain>) {
  const c = await context(req);
  if ("error" in c) return c.error;
  try {
    const result = await run(c.user.id, supabaseStore(c.db));
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ available: true, domain: present(result.domain) });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return act(req, (userId, store) => connectDomain(userId, body.hostname, store, createVercelProvider()));
}

export async function PATCH(req: NextRequest) {
  return act(req, (userId, store) => recheckDomain(userId, store, createVercelProvider()));
}

export async function DELETE(req: NextRequest) {
  return act(req, (userId, store) => removeDomain(userId, store, createVercelProvider()));
}
