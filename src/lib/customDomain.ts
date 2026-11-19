// Custom domains for an agent's site (e.g. homes.janesmith.com).
//
// STATUS: NOT AVAILABLE. Nothing in the app connects a domain today. Activating it needs work
// outside this codebase (see docs/custom-domains.md): adding each domain to the hosting project,
// TLS certificates, and the middleware host mapping. Until then the UI only checks the format of
// a domain and explains what is supported now (handle.listingflare.com).
//
// This module holds the parts that can be built and tested locally: input normalisation, format
// validation, and the ownership/verification state machine a future activation will use.

export const CUSTOM_DOMAINS_AVAILABLE = false;

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

// Ownership and connection lifecycle for a future activation. A domain is only ever "active" after
// the hosting provider confirms both DNS and the certificate; nothing here can mark it active by itself.
export type DomainState = "pending_dns" | "verifying" | "active" | "failed" | "removed";
export type DomainEvent =
  | "dns_found"
  | "dns_missing"
  | "provider_verified"
  | "provider_failed"
  | "retry"
  | "remove";

const TRANSITIONS: Record<DomainState, Partial<Record<DomainEvent, DomainState>>> = {
  pending_dns: { dns_found: "verifying", dns_missing: "pending_dns", remove: "removed" },
  verifying: { provider_verified: "active", provider_failed: "failed", dns_missing: "pending_dns", remove: "removed" },
  active: { dns_missing: "failed", provider_failed: "failed", remove: "removed" },
  failed: { retry: "pending_dns", remove: "removed" },
  removed: {},
};

export function nextDomainState(current: DomainState, event: DomainEvent): DomainState {
  return TRANSITIONS[current][event] ?? current;
}

export const DOMAIN_STATE_LABELS: Record<DomainState, string> = {
  pending_dns: "Waiting for DNS records",
  verifying: "DNS found, verifying with the host",
  active: "Connected",
  failed: "Not connected (check DNS)",
  removed: "Removed",
};
