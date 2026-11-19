import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { SITE_AGENT_HEADER, customDomainsEnabledFlag, isPlatformHost, routeCustomHostPath } from "@/lib/customDomain";

// Hosts we consider "main" and should NOT treat as agent subdomains.
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "listingflare",
  "app",
  "api",
  "admin",
  "mail",
  "webmail",
  "ftp",
  "blog",
  "docs",
  "status",
]);

// Regex to validate handles (matches the same rules as the availability API)
const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

const PLATFORM_ORIGIN = "https://www.listingflare.com";

function getSubdomain(host: string): string | null {
  // Strip port if present
  const cleanHost = host.split(":")[0].toLowerCase();

  // Parse out the subdomain. "kelvin.listingflare.com" -> "kelvin"
  // Handle both listingflare.com and www.listingflare.com as the base.
  if (cleanHost.endsWith(".listingflare.com")) {
    const parts = cleanHost.slice(0, -".listingflare.com".length).split(".");
    const sub = parts[0];
    if (!sub) return null;
    if (RESERVED_SUBDOMAINS.has(sub)) return null;
    if (!HANDLE_PATTERN.test(sub)) return null;
    return sub;
  }

  // For local dev with *.localhost:3000 or similar, bail out.
  return null;
}

// The paths the session refresh ran on before custom domains (the old matcher). Kept identical so the
// platform site behaves exactly as before.
function needsSession(pathname: string): boolean {
  return pathname === "/" || pathname === "/login" || pathname === "/signup" || pathname.startsWith("/dashboard") || pathname.startsWith("/api/");
}

// Per-instance cache of host lookups (including "not connected"), so a page view does not hit the
// database on every request. A removed domain stops resolving within the TTL.
const HOST_TTL_MS = 60_000;
const hostCache = new Map<string, { at: number; site: { agentId: string; handle: string | null } | null }>();

async function resolveHost(host: string): Promise<{ agentId: string; handle: string | null } | null> {
  const hit = hostCache.get(host);
  if (hit && Date.now() - hit.at < HOST_TTL_MS) return hit.site;
  let site: { agentId: string; handle: string | null } | null = null;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/resolve_custom_domain`, {
      method: "POST",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_host: host }),
      cache: "no-store",
    });
    if (res.ok) {
      const rows = (await res.json()) as Array<{ agent_id: string; handle: string | null }>;
      if (Array.isArray(rows) && rows[0]?.agent_id) site = { agentId: rows[0].agent_id, handle: rows[0].handle };
    } else {
      // Lookup failed: do not cache, so the next request tries again.
      return null;
    }
  } catch {
    return null;
  }
  if (hostCache.size > 5000) hostCache.clear();
  hostCache.set(host, { at: Date.now(), site });
  return site;
}

function notConnected() {
  return new NextResponse("This domain is not connected to a ListingFlare site.", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function middleware(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase();
  const { pathname } = request.nextUrl;

  // Customer domains (only when the feature is switched on). The Host header is used as delivered by
  // the hosting platform; X-Forwarded-Host is never trusted for routing.
  if (customDomainsEnabledFlag() && !isPlatformHost(host)) {
    const hostname = host.split(":")[0];
    const route = routeCustomHostPath(pathname);
    if (route.kind === "asset") return NextResponse.next();
    const site = await resolveHost(hostname);
    if (!site) return notConnected();
    if (route.kind === "platform_redirect") {
      return NextResponse.redirect(new URL(pathname + request.nextUrl.search, PLATFORM_ORIGIN), 308);
    }
    const headers = new Headers(request.headers);
    headers.set(SITE_AGENT_HEADER, site.agentId);
    if (route.kind === "agent_home") {
      const url = request.nextUrl.clone();
      url.pathname = `/agent/${site.handle || site.agentId}`;
      return NextResponse.rewrite(url, { request: { headers } });
    }
    // listing pages and the public API routes they call; no session cookies on customer domains
    return NextResponse.next({ request: { headers } });
  }

  // Platform hosts: unchanged behaviour. (A visitor-supplied site header is ignored by the listing page,
  // which only honours it on non-platform hosts; see siteAgentFor in lib/customDomain.ts.)
  const subdomain = getSubdomain(host);

  if (subdomain && pathname === "/") {
    // Rewrite /your-site-root -> /agent/{handle} while keeping the browser URL
    const url = request.nextUrl.clone();
    url.pathname = `/agent/${subdomain}`;
    return NextResponse.rewrite(url);
  }

  if (!needsSession(pathname)) return NextResponse.next();
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Everything except Next's static files: customer domains need every path. Platform hosts still
    // only refresh the session on the paths the old matcher listed (needsSession).
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
