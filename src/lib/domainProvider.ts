// Hosting-provider adapter for custom domains. Server only: the API token never reaches the browser.
//
// Implemented against Vercel's REST API for project domains:
//   POST   /v10/projects/{project}/domains            add a domain to the project
//   GET    /v9/projects/{project}/domains/{domain}    verification state + required TXT records
//   POST   /v9/projects/{project}/domains/{domain}/verify
//   GET    /v6/domains/{domain}/config                misconfigured + recommended A / CNAME values
//   DELETE /v9/projects/{project}/domains/{domain}
// It has only been exercised against a local mock (see tests); field names follow Vercel's documented
// responses, and anything missing is treated as "not confirmed" rather than as success.
//
// Configuration (names only): CUSTOM_DOMAINS_ENABLED=1, VERCEL_API_TOKEN, VERCEL_PROJECT_ID,
// optional VERCEL_TEAM_ID. VERCEL_API_BASE_URL exists only so tests can point at a local mock.
import type { DnsRecord, ProviderDomainStatus } from "./customDomain";

export type ProviderErrorCode = "in_use_elsewhere" | "invalid_domain" | "rate_limited" | "not_found" | "provider_unavailable";

export class DomainProviderError extends Error {
  constructor(public code: ProviderErrorCode, public status?: number) {
    super(code);
  }
}

export interface DomainProvider {
  add(hostname: string): Promise<void>;
  status(hostname: string): Promise<ProviderDomainStatus>;
  remove(hostname: string): Promise<void>;
}

type Fetch = typeof fetch;

export function createVercelProvider(env: Record<string, string | undefined> = process.env, f: Fetch = fetch): DomainProvider {
  const token = env.VERCEL_API_TOKEN;
  const project = env.VERCEL_PROJECT_ID;
  if (!token || !project) throw new DomainProviderError("provider_unavailable");
  const base = (env.VERCEL_API_BASE_URL || "https://api.vercel.com").replace(/\/+$/, "");
  const team = env.VERCEL_TEAM_ID ? `teamId=${encodeURIComponent(env.VERCEL_TEAM_ID)}` : "";
  const url = (path: string) => `${base}${path}${team ? (path.includes("?") ? "&" : "?") + team : ""}`;
  const p = encodeURIComponent(project);

  async function call(method: string, path: string, body?: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
    let res: Response;
    try {
      res = await f(url(path), {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
      });
    } catch {
      throw new DomainProviderError("provider_unavailable");
    }
    const json = ((await res.json().catch(() => ({}))) || {}) as Record<string, unknown>;
    return { status: res.status, json };
  }

  function fail(status: number, json: Record<string, unknown>): never {
    const code = String(((json.error as Record<string, unknown> | undefined)?.code ?? "")).toLowerCase();
    if (status === 429) throw new DomainProviderError("rate_limited", status);
    if (status === 404) throw new DomainProviderError("not_found", status);
    if (status === 409 || /in_use|already_in_use|taken|forbidden/.test(code)) throw new DomainProviderError("in_use_elsewhere", status);
    if (status === 400 || /invalid/.test(code)) throw new DomainProviderError("invalid_domain", status);
    throw new DomainProviderError("provider_unavailable", status);
  }

  const records = (list: unknown, fallbackName: string): DnsRecord[] =>
    (Array.isArray(list) ? list : [])
      .map((r) => r as Record<string, unknown>)
      .filter((r) => typeof r.type === "string" && typeof r.value === "string")
      .map((r) => ({ type: String(r.type).toUpperCase(), name: typeof r.domain === "string" ? r.domain : fallbackName, value: String(r.value), reason: typeof r.reason === "string" ? r.reason : undefined }));

  return {
    async add(hostname) {
      const r = await call("POST", `/v10/projects/${p}/domains`, { name: hostname });
      // Already on this project counts as added.
      if (r.status >= 200 && r.status < 300) return;
      if (r.status === 409 && /already_exists|project_domain_exists/.test(String((r.json.error as Record<string, unknown> | undefined)?.code ?? ""))) return;
      fail(r.status, r.json);
    },
    async status(hostname) {
      const h = encodeURIComponent(hostname);
      const d = await call("GET", `/v9/projects/${p}/domains/${h}`);
      if (d.status < 200 || d.status >= 300) fail(d.status, d.json);
      let verified = d.json.verified === true;
      let verification = records(d.json.verification, hostname);
      if (!verified) {
        // Ask the provider to re-check ownership; a failure just leaves it unverified.
        const v = await call("POST", `/v9/projects/${p}/domains/${h}/verify`);
        if (v.status >= 200 && v.status < 300 && v.json.verified === true) {
          verified = true;
          verification = [];
        }
      }
      const c = await call("GET", `/v6/domains/${h}/config`);
      if (c.status < 200 || c.status >= 300) fail(c.status, c.json);
      // Only an explicit `misconfigured: false` counts as configured.
      const misconfigured = c.json.misconfigured !== false;
      const routing: DnsRecord[] = [];
      const isApex = typeof d.json.apexName === "string" ? d.json.apexName === hostname : hostname.split(".").length === 2;
      const firstValue = (list: unknown) => {
        const best = (Array.isArray(list) ? list : []).map((x) => x as { rank?: number; value?: unknown }).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))[0];
        return best ? (Array.isArray(best.value) ? best.value.map(String) : typeof best.value === "string" ? [best.value] : []) : [];
      };
      if (isApex) for (const ip of firstValue(c.json.recommendedIPv4)) routing.push({ type: "A", name: "@", value: ip });
      else for (const cname of firstValue(c.json.recommendedCNAME)) routing.push({ type: "CNAME", name: hostname.split(".")[0], value: cname.replace(/\.$/, "") });
      return { verified, misconfigured, verification, routing };
    },
    async remove(hostname) {
      const r = await call("DELETE", `/v9/projects/${p}/domains/${encodeURIComponent(hostname)}`);
      if ((r.status >= 200 && r.status < 300) || r.status === 404) return;
      fail(r.status, r.json);
    },
  };
}

export const PROVIDER_ERROR_MESSAGES: Record<ProviderErrorCode, string> = {
  in_use_elsewhere: "This domain is already connected to another hosting account. Remove it there first, or add the TXT verification record shown here to prove you own it.",
  invalid_domain: "The hosting provider didn't accept this domain. Check the spelling.",
  rate_limited: "The hosting provider is busy. Please try again in a few minutes.",
  not_found: "The hosting provider no longer has this domain. Remove it and add it again.",
  provider_unavailable: "We couldn't reach the hosting provider. Please try again later.",
};
