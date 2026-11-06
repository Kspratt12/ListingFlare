import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createHarness } from "./_componentHarness";

// FRAMEWORK-RESOLVED metadata for 11 marketing pages. Each page's `metadata` export is merged with the real root
// layout's `metadata` by Next's own resolver (accumulateMetadata from the installed Next), then the RESOLVED title,
// canonical, Open Graph and Twitter values are checked. Scope is limited to the pages listed below; other routes are not covered.
//
// HARNESS SUBSTITUTIONS (everything else is the real code):
//  H1  Page and layout sources are compiled with the installed TypeScript (transpile only), as in _componentHarness.ts.
//  H5  _isolation.ts blocks network access.
//  H6  The root layout imports next/font/google, which only works inside Next's compiler, so that one module is replaced by a
//      fake returning a class name. It does not affect metadata.
//  H7  Next normally builds the resolver input from the route tree. Here it is built by hand in the same shape and order:
//      [root layout metadata + the root segment's file-based opengraph-image, the page's segment layout slot, the page].
//      The root segment's opengraph-image entry mirrors src/app/opengraph-image.tsx (1200x630 png).
// The same resolver setup reproduced the LIVE values for /pricing, /about and /privacy before this change (doubled brand
// suffix, homepage og:url, generic social titles), which is what makes it a fair check of the "after" state.

const { srcDir, nodeRequire, compile } = createHarness("socialmeta");
const BASE = "https://www.listingflare.com";

const fontPath = nodeRequire.resolve("next/font/google");
nodeRequire.cache[fontPath] = { id: fontPath, filename: fontPath, loaded: true, exports: { Inter: () => ({ variable: "x" }), Playfair_Display: () => ({ variable: "x" }) } } as unknown as NodeJS.Module; // H6
const { accumulateMetadata } = nodeRequire("next/dist/lib/metadata/resolve-metadata.js") as {
  accumulateMetadata: (items: unknown[], ctx: unknown) => Promise<Resolved>;
};
const modOf = (rel: string) => nodeRequire(compile(path.join(srcDir, rel))) as { metadata: unknown };
const rootMeta = modOf("app/layout.tsx").metadata;

interface Title { absolute?: string }
interface Resolved {
  title?: Title;
  description?: string;
  alternates?: { canonical?: { url: string } | string };
  robots?: { basic?: string };
  openGraph?: { title?: Title; description?: string; url?: unknown; type?: string; siteName?: string; locale?: string; images?: { url: unknown }[] };
  twitter?: { card?: string; title?: Title; description?: string; images?: { url: unknown }[] };
}

// route, source file, whether the metadata lives in the page or in a segment layout (demo)
const PAGES: { route: string; rel: string; kind: "page" | "layout"; title: string; ogTitle: string }[] = [
  { route: "/about", rel: "app/about/page.tsx", kind: "page", title: "About ListingFlare and Founder Kelvin Spratt", ogTitle: "About ListingFlare and Founder Kelvin Spratt" },
  { route: "/demo", rel: "app/demo/layout.tsx", kind: "layout", title: "Live Real Estate Software Demo | ListingFlare", ogTitle: "Live Real Estate Software Demo | ListingFlare" },
  { route: "/pricing", rel: "app/pricing/page.tsx", kind: "page", title: "Pricing: $150/Month, Unlimited Listing Sites | ListingFlare", ogTitle: "Pricing: $150/Month, Unlimited Listing Sites | ListingFlare" },
  { route: "/free-real-estate-templates", rel: "app/free-real-estate-templates/page.tsx", kind: "page", title: "Free Real Estate Agent Templates (PDF, Word) | ListingFlare", ogTitle: "Free Real Estate Agent Templates (PDF, Word) | ListingFlare" },
  { route: "/privacy", rel: "app/privacy/page.tsx", kind: "page", title: "Privacy Policy | ListingFlare", ogTitle: "Privacy Policy | ListingFlare" },
  { route: "/terms", rel: "app/terms/page.tsx", kind: "page", title: "Terms of Service | ListingFlare", ogTitle: "Terms of Service | ListingFlare" },
  { route: "/listingflare-vs-rela", rel: "app/listingflare-vs-rela/page.tsx", kind: "page", title: "ListingFlare vs Rela: Feature Comparison", ogTitle: "ListingFlare vs Rela: Feature Comparison" },
  { route: "/listingflare-vs-singlepropertysites", rel: "app/listingflare-vs-singlepropertysites/page.tsx", kind: "page", title: "ListingFlare vs SinglePropertySites.com", ogTitle: "ListingFlare vs SinglePropertySites.com" },
  { route: "/single-property-website-builder", rel: "app/single-property-website-builder/page.tsx", kind: "page", title: "Single Property Website Builder for Agents | ListingFlare", ogTitle: "Single Property Website Builder for Agents | ListingFlare" },
  { route: "/real-estate-lead-capture-software", rel: "app/real-estate-lead-capture-software/page.tsx", kind: "page", title: "Real Estate Lead Capture Software for Agents | ListingFlare", ogTitle: "Real Estate Lead Capture Software for Agents | ListingFlare" },
  { route: "/real-estate-ai-chatbot", rel: "app/real-estate-ai-chatbot/page.tsx", kind: "page", title: "AI for Real Estate Agents: Listing Chatbot | ListingFlare", ogTitle: "AI for Real Estate Agents: Listing Chatbot | ListingFlare" },
];

const rootStatic = () => ({ icon: undefined, apple: undefined, openGraph: [{ url: "/opengraph-image?test", type: "image/png", width: 1200, height: 630, alt: "ListingFlare" }], twitter: undefined, manifest: undefined });
async function resolve(p: (typeof PAGES)[number]): Promise<Resolved> {
  const mod = modOf(p.rel);
  const items = p.kind === "page"
    ? [[rootMeta, rootStatic()], [null, null], [mod.metadata, null]]
    : [[rootMeta, rootStatic()], [mod.metadata, null], [null, null]];
  return accumulateMetadata(items, { pathname: p.route, trailingSlash: false, isStaticMetadataRouteFile: false });
}
const urlOf = (v: unknown) => (typeof v === "string" ? v : v && typeof v === "object" && "url" in v ? String((v as { url: unknown }).url) : String(v));

test("resolved <title> is the intended one: no doubled brand suffix, meaningful brand mentions kept, pricing unchanged", async () => {
  for (const p of PAGES) {
    const m = await resolve(p);
    assert.equal(m.title?.absolute, p.title, p.route);
    assert.ok(!/ListingFlare\s*[|-]\s*ListingFlare\b/.test(m.title?.absolute ?? ""), `${p.route}: doubled brand suffix`);
  }
});

test("og:url equals the canonical and the page's own URL, never the homepage", async () => {
  for (const p of PAGES) {
    const m = await resolve(p);
    const canonical = urlOf(m.alternates?.canonical);
    assert.equal(canonical, BASE + p.route, `${p.route}: canonical unchanged`);
    assert.equal(urlOf(m.openGraph?.url), canonical, `${p.route}: og:url matches canonical`);
    assert.notEqual(urlOf(m.openGraph?.url), BASE, `${p.route}: does not inherit the homepage og:url`);
  }
});

test("Open Graph and Twitter titles and descriptions are page-specific, not the root defaults, and match the page", async () => {
  const rootOgTitle = "ListingFlare: Single Property Websites & AI Lead Capture"; // the root social title, now aligned with the default page title
  for (const p of PAGES) {
    const m = await resolve(p);
    assert.equal(m.openGraph?.title?.absolute, p.ogTitle, `${p.route}: og:title`);
    assert.equal(m.twitter?.title?.absolute, p.ogTitle, `${p.route}: twitter:title`);
    assert.notEqual(m.openGraph?.title?.absolute, rootOgTitle, p.route);
    assert.ok(m.description && m.description.length > 40, `${p.route}: page description present`);
    assert.equal(m.openGraph?.description, m.description, `${p.route}: og:description is the page description`);
    assert.equal(m.twitter?.description, m.description, `${p.route}: twitter:description is the page description`);
    assert.ok(!/Real estate software that creates stunning listing pages/.test(m.openGraph?.description ?? ""), `${p.route}: not the root og description`);
  }
});

test("existing social image, card and site settings are preserved: one /opengraph-image, large Twitter card with an image, site name, locale and type", async () => {
  for (const p of PAGES) {
    const m = await resolve(p);
    const ogImages = (m.openGraph?.images ?? []).map((i) => urlOf(i.url));
    assert.equal(ogImages.length, 1, `${p.route}: one og image`);
    assert.ok(/^https:\/\/www\.listingflare\.com\/opengraph-image/.test(ogImages[0]), `${p.route}: og image is the site image`);
    assert.equal(m.twitter?.card, "summary_large_image", `${p.route}: twitter card`);
    assert.deepEqual((m.twitter?.images ?? []).map((i) => urlOf(i.url)), ogImages, `${p.route}: twitter image follows og image`);
    assert.equal(m.openGraph?.type, "website", p.route);
    assert.equal(m.openGraph?.siteName, "ListingFlare", p.route);
    assert.equal(m.openGraph?.locale, "en_US", p.route);
  }
});

test("indexing is unchanged: these pages still resolve to index, follow", async () => {
  for (const p of PAGES) assert.equal((await resolve(p)).robots?.basic, "index, follow", p.route);
});

test("the root layout still supplies the defaults a page without its own social tags would inherit (its social title now equals the default page title)", async () => {
  const m = await accumulateMetadata([[rootMeta, rootStatic()]], { pathname: "/", trailingSlash: false, isStaticMetadataRouteFile: false });
  assert.equal(m.openGraph?.title?.absolute, "ListingFlare: Single Property Websites & AI Lead Capture");
  assert.equal(urlOf(m.openGraph?.url), BASE);
});

test("no metadata resolution reached the network", () => {
  assertNoNetworkAttempts();
});
