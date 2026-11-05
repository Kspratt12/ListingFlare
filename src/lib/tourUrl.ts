// Validation for the virtual-tour link an agent pastes into a listing. The link is
// used as an <iframe src> on the public listing page, so it must be a plain https
// link in a format a supported provider documents for embedding. Anything else
// (javascript:, data:, relative or protocol-relative links, links with credentials or
// a port, look-alike hosts, pages that are not embed links) is rejected, and rendering
// shows nothing instead of a frame.
//
// What this check does and does not establish: it parses the URL and compares the
// parsed hostname and path against explicit rules. It never searches the text for a
// provider name. Passing means "https, a listed provider host, and a documented embed
// path". It does NOT prove the destination is safe or trustworthy (the provider
// controls what that page does), and it does NOT guarantee the page will load inside
// a frame (a provider can change its formats or refuse framing).

export interface TourHost {
  name: string;
  // true: the name and any subdomain of it (my.matterport.com for matterport.com).
  // false: exactly this hostname.
  subdomains: boolean;
}

export interface TourProviderRule {
  provider: string;
  // "documented": host and path format taken from the provider's own embed documentation.
  // "unverified": the official page text could not be read; accepted as before, flagged for review.
  basis: "documented" | "unverified";
  hosts: readonly TourHost[];
  // The path must start with one of these and have at least one more character. Omitted: any path.
  pathPrefixes?: readonly string[];
}

// Sources reviewed (provider documentation, not marketing copy):
//   Kuula     https://kuula.co/help/embed-integration
//   CloudPano https://help.cloudpano.com/en/articles/6139556-my-embedded-tour-is-not-working
//   iGUIDE    https://docs.youriguide.com/docs/integrations/embed
// Add or change a provider only from its own documentation, one rule at a time.
export const TOUR_PROVIDER_RULES: readonly TourProviderRule[] = [
  {
    // UNVERIFIED FORMAT: Matterport's support article could not be read from the official page, only from
    // search excerpts (share links of the form my.matterport.com/show/?m=...). Until that is confirmed in a
    // browser, the rule stays as broad as the previous one (matterport.com and subdomains, any path) so an
    // existing Matterport tour does not stop displaying. Narrow it once the documented format is verified.
    provider: "Matterport",
    basis: "unverified",
    hosts: [{ name: "matterport.com", subdomains: true }],
  },
  {
    // Documented: iframe src https://kuula.co/share/... ; MLS-approved tours use https://mls.kuu.la/share/...
    // Kuula states that /post/ profile links cannot be embedded (handled separately below).
    provider: "Kuula",
    basis: "documented",
    hosts: [
      { name: "kuula.co", subdomains: false },
      { name: "www.kuula.co", subdomains: false },
      { name: "mls.kuu.la", subdomains: false },
    ],
    pathPrefixes: ["/share/"],
  },
  {
    // Documented: iframe src https://app.cloudpano.com/tours/<id>. CloudPano's default is a script snippet that
    // inserts this frame, and its support page says direct iframe use is not supported by their support team.
    provider: "CloudPano",
    basis: "documented",
    hosts: [{ name: "app.cloudpano.com", subdomains: false }],
    pathPrefixes: ["/tours/"],
  },
  {
    // Documented: https://youriguide.com/embed/{path}/ and https://unbranded.youriguide.com/embed/{path}/.
    provider: "iGUIDE",
    basis: "documented",
    hosts: [
      { name: "youriguide.com", subdomains: false },
      { name: "unbranded.youriguide.com", subdomains: false },
    ],
    pathPrefixes: ["/embed/"],
  },
];

// Formats that are NOT accepted because they could not be confirmed from official documentation.
// Kept here so the gap is visible; nothing below is accepted by validateTourUrl.
export const UNVERIFIED_TOUR_FORMATS: readonly string[] = [
  "Matterport: accepted domain-wide (see rule above); the documented embed format is not yet verified from the official page.",
  "iGUIDE: iguidephotos.com and iguideradix.com are listed as iGUIDE viewer domains but not as embed hosts.",
  "Kuula: subdomains other than www.kuula.co, and kuula.co paths other than /share/.",
  "CloudPano: cloudpano.com itself and other subdomains of it.",
  "Any 'other 360 or 3D tour provider', YouTube or video links.",
];

export const TOUR_URL_HELP =
  "Paste the https:// share or embed link from Matterport, Kuula, CloudPano or iGUIDE, in the format that provider documents for embedding. A link from one of these providers can still fail to load inside your listing page.";

const MAX_LENGTH = 2048;

export type TourUrlCode =
  | "type"
  | "too_long"
  | "forbidden_characters"
  | "malformed"
  | "scheme"
  | "credentials"
  | "port"
  | "host"
  | "path"
  | "kuula_post";

export type TourUrlResult =
  | { ok: true; url: string | null }
  | { ok: false; code: TourUrlCode; message: string };

const MESSAGES: Record<TourUrlCode, string> = {
  type: `That link can't be used as a virtual tour. ${TOUR_URL_HELP}`,
  too_long: `That link can't be used as a virtual tour. ${TOUR_URL_HELP}`,
  forbidden_characters: `That link can't be used as a virtual tour. ${TOUR_URL_HELP}`,
  malformed: `That link can't be used as a virtual tour. ${TOUR_URL_HELP}`,
  scheme: `That link can't be used as a virtual tour. ${TOUR_URL_HELP}`,
  credentials: `That link can't be used as a virtual tour. ${TOUR_URL_HELP}`,
  port: `That link can't be used as a virtual tour. ${TOUR_URL_HELP}`,
  host: `That link can't be used as a virtual tour. ${TOUR_URL_HELP}`,
  path: `That link is from a supported provider but isn't in the embed format that provider documents. Open the tour in your provider's account, copy its share or embed link, and paste that instead.`,
  kuula_post:
    "That is a Kuula post or profile link, which Kuula says can't be embedded. Open the tour in Kuula, use its Share or Embed option, and paste the link that starts with https://kuula.co/share/.",
};

function reject(code: TourUrlCode): TourUrlResult {
  return { ok: false, code, message: MESSAGES[code] };
}

function hostMatches(hostname: string, host: TourHost): boolean {
  return hostname === host.name || (host.subdomains && hostname.endsWith("." + host.name));
}

function hostIsPlain(hostname: string): boolean {
  if (!hostname || hostname.endsWith(".")) return false;
  // Every label must be non-empty ASCII letters, digits or hyphens (the URL parser has already
  // converted any international name to its ASCII form), which rejects ".matterport.com" and "a..b".
  return hostname.split(".").every((label) => /^[a-z0-9-]+$/.test(label));
}

function hasPathPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname.startsWith(p) && pathname.length > p.length);
}

// An empty value is valid (no tour). A non-empty value must be a supported https
// link in a documented embed format; on success `url` is the parser-normalized
// address (ASCII host, no stray whitespace), which is what should be stored or rendered.
export function validateTourUrl(input: unknown): TourUrlResult {
  if (input === null || input === undefined) return { ok: true, url: null };
  if (typeof input !== "string") return reject("type");
  const value = input.trim();
  if (value === "") return { ok: true, url: null };
  if (value.length > MAX_LENGTH) return reject("too_long");
  // Whitespace, control characters and backslashes are rejected before parsing so the
  // URL parser can never silently "repair" them (it drops tabs and newlines, and treats
  // a backslash as a slash).
  if (/[\u0000- \u007f-\u009f\\]/.test(value)) return reject("forbidden_characters");

  let parsed: URL;
  try {
    parsed = new URL(value); // no base: relative and protocol-relative links throw
  } catch {
    return reject("malformed");
  }
  if (parsed.protocol !== "https:") return reject("scheme");
  if (parsed.username !== "" || parsed.password !== "") return reject("credentials");
  if (parsed.port !== "") return reject("port"); // the default 443 is normalized to ""
  if (!hostIsPlain(parsed.hostname)) return reject("host");

  const rule = TOUR_PROVIDER_RULES.find((r) => r.hosts.some((h) => hostMatches(parsed.hostname, h)));
  if (!rule) return reject("host");
  // The parser has already resolved "." and ".." segments, so this is the path that will be requested.
  if (rule.pathPrefixes && !hasPathPrefix(parsed.pathname, rule.pathPrefixes)) {
    if (rule.provider === "Kuula" && parsed.pathname.startsWith("/post/")) return reject("kuula_post");
    return reject("path");
  }
  return { ok: true, url: parsed.href };
}

// For rendering a stored value: the safe address, or null when the value is empty or
// unsupported. Never throws, never rewrites the stored value.
export function safeTourEmbedUrl(stored: unknown): string | null {
  const result = validateTourUrl(stored);
  return result.ok ? result.url : null;
}

// For forms: null when the value is acceptable (including empty), otherwise a message.
export function tourUrlProblem(value: unknown): string | null {
  const result = validateTourUrl(value);
  return result.ok ? null : result.message;
}
