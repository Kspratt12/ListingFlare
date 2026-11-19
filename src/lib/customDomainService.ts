// Custom-domain actions for one agent: connect, check again, remove. Database and provider are passed
// in so every rule can be tested with fakes. The API route (app/api/domains/route.ts) supplies Supabase
// (service role, after authenticating the agent) and the Vercel adapter.
import { RECHECK_MIN_MS, checkCustomDomain, isPlatformHost, nextCheckDelayMs, stateFromProvider, type DnsRecord, type DomainState } from "./customDomain";
import { DomainProviderError, PROVIDER_ERROR_MESSAGES, type DomainProvider } from "./domainProvider";

export interface DomainRow {
  id: string;
  agent_id: string;
  hostname: string;
  status: DomainState;
  dns_records: DnsRecord[];
  last_error: string | null;
  last_checked_at: string | null;
  check_count: number;
  connected_at: string | null;
}

export interface DomainStore {
  current(agentId: string): Promise<DomainRow | null>;
  // Insert a new claim. Resolves "conflict" when the hostname is already claimed by anyone (unique
  // index on hostname where status <> 'removed'), or when this agent already has a domain.
  insert(agentId: string, hostname: string): Promise<DomainRow | "conflict">;
  ownerOf(hostname: string): Promise<string | null>;
  update(id: string, patch: Partial<DomainRow>): Promise<DomainRow>;
}

export type ActionResult = { ok: true; domain: DomainRow | null } | { ok: false; status: number; error: string };

async function applyStatus(store: DomainStore, provider: DomainProvider, row: DomainRow, now: Date): Promise<DomainRow> {
  try {
    const s = await provider.status(row.hostname);
    const status = stateFromProvider(s);
    return await store.update(row.id, {
      status,
      dns_records: [...s.verification, ...s.routing],
      last_error: null,
      last_checked_at: now.toISOString(),
      check_count: status === "connected" ? 0 : row.check_count + 1,
      connected_at: status === "connected" ? row.connected_at || now.toISOString() : null,
    });
  } catch (e) {
    const code = e instanceof DomainProviderError ? e.code : "provider_unavailable";
    // A temporary provider problem keeps the last known state; anything else is shown as an error.
    const keep = code === "rate_limited" || code === "provider_unavailable";
    return store.update(row.id, {
      status: keep && row.status !== "pending" ? row.status : "error",
      last_error: code,
      last_checked_at: now.toISOString(),
      check_count: row.check_count + 1,
    });
  }
}

export async function connectDomain(agentId: string, input: unknown, store: DomainStore, provider: DomainProvider, now = new Date()): Promise<ActionResult> {
  const check = checkCustomDomain(input);
  if (!check.ok) return { ok: false, status: 400, error: check.reason };
  if (isPlatformHost(check.domain)) return { ok: false, status: 400, error: "That address belongs to ListingFlare and can't be connected." };
  const existing = await store.current(agentId);
  if (existing && existing.hostname === check.domain) return { ok: true, domain: existing };
  if (existing) return { ok: false, status: 409, error: `Remove ${existing.hostname} before connecting a different domain.` };
  const inserted = await store.insert(agentId, check.domain);
  if (inserted === "conflict") {
    const owner = await store.ownerOf(check.domain);
    return {
      ok: false,
      status: 409,
      error: owner && owner !== agentId
        ? "This domain is already connected to another ListingFlare account. If it's yours, contact the account holder or remove it there first."
        : "This domain is already being connected. Refresh the page.",
    };
  }
  try {
    await provider.add(check.domain);
  } catch (e) {
    const code = e instanceof DomainProviderError ? e.code : "provider_unavailable";
    // in_use_elsewhere still continues to status(): the provider then returns the TXT record that proves ownership.
    if (code !== "in_use_elsewhere") {
      const row = await store.update(inserted.id, { status: "error", last_error: code, last_checked_at: now.toISOString() });
      return { ok: true, domain: row };
    }
  }
  return { ok: true, domain: await applyStatus(store, provider, inserted, now) };
}

export async function recheckDomain(agentId: string, store: DomainStore, provider: DomainProvider, now = new Date()): Promise<ActionResult> {
  const row = await store.current(agentId);
  if (!row) return { ok: false, status: 404, error: "No domain to check." };
  if (row.status === "removing") return { ok: false, status: 409, error: "This domain is being removed." };
  if (row.last_checked_at && now.getTime() - new Date(row.last_checked_at).getTime() < RECHECK_MIN_MS) {
    return { ok: false, status: 429, error: "Checked a moment ago. DNS changes can take a while; try again in about 30 seconds." };
  }
  if (row.status === "error" && row.last_error && row.last_error !== "in_use_elsewhere") {
    // Retry adding after an earlier add failure.
    try {
      await provider.add(row.hostname);
    } catch (e) {
      const code = e instanceof DomainProviderError ? e.code : "provider_unavailable";
      if (code !== "in_use_elsewhere") return { ok: true, domain: await store.update(row.id, { last_error: code, last_checked_at: now.toISOString(), check_count: row.check_count + 1 }) };
    }
  }
  return { ok: true, domain: await applyStatus(store, provider, row, now) };
}

export async function removeDomain(agentId: string, store: DomainStore, provider: DomainProvider, now = new Date()): Promise<ActionResult> {
  const row = await store.current(agentId);
  if (!row) return { ok: true, domain: null };
  // Stop serving immediately: only "connected" rows are resolved by the middleware.
  await store.update(row.id, { status: "removing", last_checked_at: now.toISOString() });
  try {
    await provider.remove(row.hostname);
  } catch (e) {
    const code = e instanceof DomainProviderError ? e.code : "provider_unavailable";
    // The domain no longer serves this agent (status "removing"); removing again retries the clean-up.
    return { ok: false, status: 502, error: `The domain was disconnected, but the hosting provider clean-up failed (${code.replace(/_/g, " ")}). Try removing again.` };
  }
  await store.update(row.id, { status: "removed" });
  return { ok: true, domain: null };
}

export function nextAutomaticCheck(row: Pick<DomainRow, "check_count" | "last_checked_at">): Date | null {
  if (!row.last_checked_at) return null;
  return new Date(new Date(row.last_checked_at).getTime() + nextCheckDelayMs(row.check_count));
}

export function errorMessage(code: string | null): string | null {
  if (!code) return null;
  return (PROVIDER_ERROR_MESSAGES as Record<string, string>)[code] || "Something went wrong connecting this domain.";
}
