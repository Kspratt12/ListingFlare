import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

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

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const subdomain = getSubdomain(host);

  if (subdomain && request.nextUrl.pathname === "/") {
    // Rewrite /your-site-root -> /agent/{handle} while keeping the browser URL
    const url = request.nextUrl.clone();
    url.pathname = `/agent/${subdomain}`;
    return NextResponse.rewrite(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on the root + dashboard + auth routes
    "/",
    "/dashboard/:path*",
    "/api/:path*",
    "/login",
    "/signup",
  ],
};
