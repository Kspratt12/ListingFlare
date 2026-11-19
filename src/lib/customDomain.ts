// Custom domains for an agent's site (e.g. homes.janesmith.com): the agent's public listing collection
// (their /agent page) and their listing pages, served on a hostname the agent owns.
//
// Availability is decided on the server by customDomainsConfigured(): the feature flag AND the hosting
// provider credentials must all be set (lib/domainProvider.ts). Without them the Settings card only
// checks the format of a domain and explains what works today. See docs/custom-domains.md.
//
// This module is pure: input normalisation, format validation, platform-host rules and the lifecycle.

// Routing switch read by the middleware (which does not need provider credentials).
export function customDomainsEnabledFlag(env: Record<string, string | undefined> = process.env): boolean {
  return env.CUSTOM_DOMAINS_ENABLED === "1";
}

// Header the middleware sets (overwriting any visitor value) on customer-domain requests to name the
// agent whose site it is.
export const SITE_AGENT_HEADER = "x-lf-site-agent";

// The agent a request is scoped to, or null for platform hosts. A header on a platform host is ignored,
// so it can't be used to change what listingflare.com serves.
export function siteAgentFor(host: string | null, headerValue: string | null, env: Record<string, string | undefined> = process.env): string | null {
  if (!customDomainsEnabledFlag(env) || !host || isPlatformHost(host, env)) return null;
  return headerValue && /^[0-9a-f-]{36}$/i.test(headerValue) ? headerValue : null;
}

export function customDomainsConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return env.CUSTOM_DOMAINS_ENABLED === "1" && !!env.VERCEL_API_TOKEN && !!env.VERCEL_PROJECT_ID;
}

// Hosts that always serve the normal ListingFlare site (dashboard, login, marketing pages). Requests
// for any other host are treated as a possible customer domain. Extra platform hosts (for example a
// staging domain) can be listed in PLATFORM_HOSTS, comma-separated.
export function isPlatformHost(host: string, env: Record<string, string | undefined> = process.env): boolean {
  const h = host.split(":")[0].toLowerCase().replace(/\.$/, "");
  if (!h) return true;
  if (h === "listingflare.com" || h.endsWith(".listingflare.com")) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h === "127.0.0.1" || h === "[::1]") return true;
  if (h.endsWith(".vercel.app")) return true;
  const extra = (env.PLATFORM_HOSTS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return extra.includes(h);
}

// Paths a customer domain may serve. Everything else (dashboard, login, signup, settings, blog...) is
// sent to the main ListingFlare site, so sign-in cookies never live on a customer's domain.
const CUSTOM_DOMAIN_API = new Set([
  "/api/ai/chat",
  "/api/leads/create",
  "/api/leads/hot-visitor",
  "/api/showings/book",
  "/api/listings/alerts/subscribe",
  "/api/listings/alerts/unsubscribe",
]);

export type CustomHostRoute = { kind: "agent_home" } | { kind: "listing" } | { kind: "asset" } | { kind: "api" } | { kind: "platform_redirect" };

export function routeCustomHostPath(pathname: string): CustomHostRoute {
  if (pathname === "/" || pathname === "") return { kind: "agent_home" };
  if (/^\/listing\/[^/]+(\/unbranded)?\/?$/.test(pathname)) return { kind: "listing" };
  if (pathname.startsWith("/_next/") || /^\/[^/]+\.(png|jpg|jpeg|svg|ico|webp|txt|webmanifest|js)$/.test(pathname)) return { kind: "asset" };
  if (CUSTOM_DOMAIN_API.has(pathname)) return { kind: "api" };
  return { kind: "platform_redirect" };
}

export type DomainCheck =
  | { ok: true; domain: string; kind: "apex" | "subdomain" }
  | { ok: false; reason: string };

const RESERVED_SUFFIXES = ["localhost", "local", "test", "example", "invalid", "internal", "lan", "home.arpa"];
// Domains the agent cannot own, or that belong to the platform / hosting providers.
const BLOCKED_SUFFIXES = ["listingflare.com", "vercel.app", "vercel.com", "supabase.co", "github.io", "netlify.app"];
// Common two-part public suffixes, so "janesmith.co.uk" is treated as an apex domain.
const TWO_PART_SUFFIXES = new Set(["co.uk", "org.uk", "com.au", "net.au", "co.nz", "com.br", "co.za", "com.mx", "co.jp", "co.in", "com.ca"]);

export function normalizeDomainInput(input: unknown): string {
  if (typeof input !== "string") return "";
  let s = input.trim().toLowerCase();
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, ""); // scheme
  s = s.split(/[/?#]/)[0]; // path, query, fragment
  s = s.replace(/^[^@]*@/, ""); // userinfo
  s = s.replace(/:\d+$/, ""); // port
  s = s.replace(/\.$/, ""); // trailing dot
  return s;
}

export function checkCustomDomain(input: unknown): DomainCheck {
  const domain = normalizeDomainInput(input);
  if (!domain) return { ok: false, reason: "Enter a domain, for example homes.yourname.com." };
  if (domain.length > 253) return { ok: false, reason: "That domain is too long." };
  if (/[^a-z0-9.-]/.test(domain)) {
    return { ok: false, reason: "Use letters, numbers, hyphens and dots only. For international domains, enter the xn-- form." };
  }
  if (/^\d+(\.\d+){3}$/.test(domain)) return { ok: false, reason: "Enter a domain name, not an IP address." };
  const labels = domain.split(".");
  if (labels.length < 2) return { ok: false, reason: "Include the full domain, for example yourname.com." };
  for (const l of labels) {
    if (l.length === 0) return { ok: false, reason: "The domain has an empty part (two dots in a row)." };
    if (l.length > 63) return { ok: false, reason: "Each part of a domain must be 63 characters or fewer." };
    if (l.startsWith("-") || l.endsWith("-")) return { ok: false, reason: "Parts of a domain can't start or end with a hyphen." };
  }
  const tld = labels[labels.length - 1];
  if (!/^(xn--[a-z0-9-]+|[a-z]{2,63})$/.test(tld)) return { ok: false, reason: "That doesn't end in a valid top-level domain like .com." };
  const endsWith = (suffix: string) => domain === suffix || domain.endsWith(`.${suffix}`);
  if (RESERVED_SUFFIXES.some(endsWith)) return { ok: false, reason: "That is a reserved name that can't be used on the public internet." };
  if (BLOCKED_SUFFIXES.some(endsWith)) {
    return { ok: false, reason: "Use a domain you own. ListingFlare and hosting-provider addresses can't be connected." };
  }
  const lastTwo = labels.slice(-2).join(".");
  const apexLabels = TWO_PART_SUFFIXES.has(lastTwo) ? 3 : 2;
  if (labels.length < apexLabels) return { ok: false, reason: "Include your full domain name, not just the ending." };
  return { ok: true, domain, kind: labels.length === apexLabels ? "apex" : "subdomain" };
}

// Lifecycle. A domain is only "connected" when the hosting provider reports it verified AND correctly
// configured; nothing in the app can mark it connected on its own.
export type DomainState = "pending" | "configuration_needed" | "verifying" | "connected" | "error" | "removing" | "removed";

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  reason?: string;
}

// What the hosting provider reports about a domain. Records come only from the provider's response.
export interface ProviderDomainStatus {
  // provider confirmed ownership (no outstanding TXT verification)
  verified: boolean;
  // provider reports DNS does not yet point at the hosting project
  misconfigured: boolean;
  // ownership-verification records the provider asks for (e.g. TXT)
  verification: DnsRecord[];
  // routing records the provider recommends (A / CNAME); may be empty if the provider gave none
  routing: DnsRecord[];
}

export function stateFromProvider(p: ProviderDomainStatus): DomainState {
  if (!p.verified) return "verifying";
  if (p.misconfigured) return "configuration_needed";
  return "connected";
}

export const DOMAIN_STATE_LABELS: Record<DomainState, string> = {
  pending: "Adding the domain",
  configuration_needed: "DNS records needed",
  verifying: "Ownership verification needed",
  connected: "Connected",
  error: "Problem connecting",
  removing: "Removing",
  removed: "Removed",
};

// Manual "check again": at most once per 30 seconds per domain; automatic checks back off.
export const RECHECK_MIN_MS = 30_000;
export function nextCheckDelayMs(checkCount: number): number {
  return Math.min(6 * 60 * 60 * 1000, RECHECK_MIN_MS * 2 ** Math.max(0, Math.min(checkCount, 12)));
}
