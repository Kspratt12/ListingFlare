import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// SOURCE CHECKS ONLY. These read the page, layout and wiring sources and check how they use the tested helpers
// (sessionState.ts, dashboardListings.ts, swrCache.ts). They do NOT render the page or run its effects: this repo has no
// DOM test library, so the React wiring below is verified by reading the code, not by executing it.

const srcDir = process.env.LF_SRC_DIR as string;
const read = (rel: string) => fs.readFileSync(path.join(srcDir, rel), "utf8").replace(/\r/g, "");

test("listings page: the load goes through the tested loader, with no early return that can leave it loading", () => {
  const page = read("app/dashboard/page.tsx");
  assert.match(page, /loadDashboardListings<Listing>\(/);
  assert.ok(!/async function fetchData\(\)/.test(page), "the old fetchData with its early return is gone");
  assert.ok(!/if \(!uid\) return;\s*\n\s*\n?\s*\/\/ Fetch only this agent's listings/.test(page));
  // the effect that loads listings is keyed on the account epoch and the retry counter
  assert.match(page, /\}, \[sessionEpoch, reloadKey\]\);/);
  // results are applied only for the current load
  assert.match(page, /if \(!res \|\| cancelled\) return;/);
  assert.match(page, /isCurrent: \(\) => !cancelled && startedAt === getSessionGeneration\(\)/);
});

test("listings page: the empty state, first-run block and demo prompt cannot show while there is a load error", () => {
  const page = read("app/dashboard/page.tsx");
  assert.match(page, /\{!loadError && listings\.length === 0 && \(\s*\n\s*<div className="rounded-xl border border-brand-200/, "first-run block is gated");
  const i = page.indexOf(") : loadError && listings.length === 0 ? (");
  const j = page.indexOf(") : listings.length === 0 ? (");
  assert.ok(i > -1 && j > i, "the error branch comes before the empty-account branch");
  assert.match(page, /kind=\{loadError\} hasRows=\{false\} onRetry=\{\(\) => setReloadKey\(\(k\) => k \+ 1\)\}/, "error view has a working Try again");
  assert.match(page, /kind=\{loadError\} hasRows onRetry=\{\(\) => setReloadKey\(\(k\) => k \+ 1\)\}/, "banner with kept rows has Try again");
  assert.match(page, /Sign in again/);
});

test("listings page: rows and cache are tied to the account", () => {
  const page = read("app/dashboard/page.tsx");
  assert.ok(!/\bcacheGet\(|\bcacheSet\(/.test(page), "only owner-checked cache calls are used");
  assert.match(page, /cacheGetFor<Listing\[\]>\(LISTINGS_CACHE_KEY, peekLocalUserId\(\)\)/, "the first-render seed is owner-checked");
  assert.match(page, /if \(seenEpoch !== sessionEpoch\) \{[\s\S]*?setListings\(\[\]\);[\s\S]*?setLoading\(true\);/, "rows are dropped in the same render when the account changes");
  assert.match(page, /cacheSetFor\(LISTINGS_CACHE_KEY, listings, rowsOwner\.current\)/, "later cache writes only for the rows' own account");
});

test("listings page: the query itself is unchanged (columns, exact count, ordering, no pagination added)", () => {
  const page = read("app/dashboard/page.tsx");
  assert.match(page, /\.select\(DASHBOARD_LISTING_COLUMNS, \{ count: "exact" \}\)\s*\n\s*\.eq\("agent_id", uid\)\s*\n\s*\.order\("created_at", \{ ascending: false \}\)/);
  assert.ok(!/\.range\(|\.limit\(/.test(page.slice(page.indexOf("loadDashboardListings<Listing>("), page.indexOf("}, [sessionEpoch, reloadKey]);"))));
});

test("layout: the account epoch is provided to tabs, and profile and unread-count work for an old account is dropped", () => {
  const layout = read("app/dashboard/layout.tsx");
  assert.match(layout, /value=\{\{ userId, profile, setProfile, sessionEpoch \}\}/);
  assert.match(layout, /subscribeToSessionChanges\(\(uid\) => \{[\s\S]*?setSessionEpoch\(\(n\) => n \+ 1\);[\s\S]*?setProfile\(null\);[\s\S]*?setUnreadLeads\(0\);/);
  assert.match(layout, /unsubscribe\(\);/);
  assert.match(layout, /const stale = \(\) => !active \|\| mine !== run \|\| startedAt !== getSessionGeneration\(\);/);
  assert.match(layout, /startedAt === getSessionGeneration\(\) && count !== null/, "unread count is generation-checked");
  assert.match(layout, /\}, \[pathname, sessionEpoch\]\);/, "unread count refreshes when the account changes");
  // Sign Out still clears everything explicitly
  assert.match(layout, /clearCache\(\);\s*\n\s*resetLocalUserId\(\);/);
});

test("session wiring: the real client feeds the manager and the cache owner follows the account", () => {
  const s = read("lib/agentSession.tsx");
  assert.match(s, /onAuthStateChange\(\(event, session\) => onEvent\(event, session\?\.user\.id \?\? null\)\)/);
  assert.match(s, /onUserChanged: \(userId\) => setCacheOwner\(userId\)/);
  assert.match(s, /readSession: \(\) => createClient\(\)\.auth\.getSession\(\)/);
  const code = s.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.ok(!/\.getUser\(\)/.test(code), "still a local session read, not a network call");
});

test("middleware and RLS are untouched by this change", () => {
  const mw = read("lib/supabase/middleware.ts");
  assert.match(mw, /request\.nextUrl\.pathname\.startsWith\("\/dashboard"\)/);
  assert.match(mw, /NextResponse\.redirect\(url\)/);
});

test("no test above reached the network", () => {
  assertNoNetworkAttempts();
});
