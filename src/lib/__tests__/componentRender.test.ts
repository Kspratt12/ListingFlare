import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createHarness } from "./_componentHarness";

// D1 ACTUAL-COMPONENT tests: the REAL public listing page (ListingPageClient) and the REAL city page
// (src/app/homes/[city]/page.tsx) rendered to server-side HTML with FICTIONAL data. They check that agent- or
// database-supplied text cannot end the JSON-LD <script> element and that the JSON-LD parses back unchanged.
//
// Evidence class: server-rendered markup. It is NOT a browser. Setup and the shared substitutions (H1, H2) are
// described in _componentHarness.ts. Substitutions made in THIS file, for the city page only:
//  H3  The city page builds its own Supabase client. The one module "@supabase/supabase-js" is replaced by a fake
//      whose query chain returns fictional rows. No database or network is involved.
//  H4  React 18 stable has no cache(); Next supplies one for server components. When it is missing, an identity
//      function is installed for the duration of the test and removed afterwards.
// Not exercised: hydration, client effects, Next routing/metadata, real data, any browser behaviour.
// Nothing in this file depends on the virtual-tour URL policy.

const { srcDir, nodeRequire, React, renderToStaticMarkup, compile, load, ldBlocks, listingPage } = createHarness("jsonld");

const SCRIPT_BREAKOUT = "x</script><script>alert(1)</script>";

test("component: the real listing page renders with fictional data and one JSON-LD block", () => {
  const html = listingPage({});
  assert.equal(ldBlocks(html).length, 1);
  assert.ok(html.length > 5000);
});

test("component: script-closing text in description and street cannot break out of the listing page's JSON-LD, and parses back unchanged", () => {
  const html = listingPage({ description: SCRIPT_BREAKOUT, street: "</ScRiPt><img src=x onerror=alert(1)>" });
  const blocks = ldBlocks(html);
  assert.equal(blocks.length, 1);
  assert.ok(!blocks[0].includes("<"), "no literal < inside the JSON-LD element");
  assert.ok(!/<script>alert\(1\)/.test(html), "no injected script element anywhere in the page");
  assert.equal(JSON.parse(blocks[0]).description, SCRIPT_BREAKOUT);
});

test("component: the real city page contains a script-closing city name inside its JSON-LD (stubbed data source, fictional rows)", async () => {
  const hadCache = typeof (React as unknown as { cache?: unknown }).cache === "function";
  if (!hadCache) (React as unknown as { cache: (f: unknown) => unknown }).cache = (f) => f; // H4
  const supPath = nodeRequire.resolve("@supabase/supabase-js");
  const previous = nodeRequire.cache[supPath];
  try {
    const EVIL_CITY = "Exampleville</script><script>alert(1)</script>";
    const { slugifyCity } = nodeRequire(compile(path.join(srcDir, "lib/cities.ts")));
    const rows = [{
      id: "00000000-0000-4000-8000-000000000002", slug: "fictional-home", agent_id: "00000000-0000-4000-8000-0000000000a1", street: "1 Fictional Way",
      city: EVIL_CITY, state: "NC", price: 450000, beds: 3, baths: 2, sqft: 1800, photos: [], description: "d", agent: null, created_at: "2026-01-01T00:00:00Z",
    }];
    const chain: Record<string, unknown> = {};
    for (const m of ["select", "eq", "ilike", "order", "limit", "in"]) chain[m] = () => chain;
    chain.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(res, rej);
    nodeRequire.cache[supPath] = { id: supPath, filename: supPath, loaded: true, exports: { createClient: () => ({ from: () => chain }) } } as unknown as NodeJS.Module; // H3
    delete nodeRequire.cache[compile(path.join(srcDir, "app/homes/[city]/page.tsx"))];
    const CityPage = load("app/homes/[city]/page.tsx") as unknown as (p: { params: Promise<{ city: string }> }) => Promise<React.ReactElement>;
    const el = await CityPage({ params: Promise.resolve({ city: `${slugifyCity(EVIL_CITY)}-nc` }) });
    const html = renderToStaticMarkup(el);
    const blocks = ldBlocks(html);
    assert.equal(blocks.length, 1);
    assert.ok(html.length > 2000, "the page rendered");
    assert.ok(!blocks[0].includes("<"), "no literal < inside the JSON-LD element");
    assert.ok(!/<script>alert\(1\)/.test(html));
    assert.ok(JSON.parse(blocks[0]).name.includes(EVIL_CITY), "the JSON-LD parses back with the original city text");
  } finally {
    if (previous) nodeRequire.cache[supPath] = previous;
    else delete nodeRequire.cache[supPath];
    if (!hadCache) delete (React as unknown as { cache?: unknown }).cache;
  }
});

test("no component above reached the network", () => {
  assertNoNetworkAttempts();
});
