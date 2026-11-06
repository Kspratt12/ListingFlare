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
  // the account, the generation and the epoch come from ONE store snapshot, read with useSyncExternalStore
  assert.match(layout, /const session = useSyncExternalStore\(subscribeToSessionChanges, getSessionSnapshot, getServerSessionSnapshot\);/);
  assert.match(layout, /const userId = session\.userId;/);
  assert.match(layout, /const sessionEpoch = session\.generation;/);
  assert.ok(!/setSessionEpoch|setUserId|setTimeout\([^)]*\)[^\n]*sessionEpoch/.test(layout), "no separately updated copies of the account or the epoch");
  assert.ok(!/setCacheOwner/.test(layout), "the cache owner is moved by the session store, not by the layout");
  // nothing loaded for another account is used, not even for the render in which the account changes
  assert.match(layout, /const profile = rawProfile && rawProfile\.id === userId \? rawProfile : null;/);
  assert.match(layout, /const unreadLeads = unread\.userId === userId \? unread\.count : 0;/);
  assert.match(layout, /const stale = \(\) => !active \|\| startedAt !== getSessionGeneration\(\);/);
  assert.match(layout, /\}, \[userId, sessionEpoch\]\);/, "the profile loads for the current account and reloads when it changes");
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

const TABS: [string, string][] = [
  ["leads", "app/dashboard/leads/page.tsx"],
  ["offers", "app/dashboard/offers/page.tsx"],
  ["showings", "app/dashboard/showings/page.tsx"],
  ["seller-prospects", "app/dashboard/seller-prospects/page.tsx"],
];

test("tab pages: every cache write names its owner, and every request is tied to the account that started it", () => {
  for (const [name, rel] of TABS) {
    const src = read(rel);
    assert.ok(!/\bcacheSet\(/.test(src), `${name}: no ownerless cacheSet remains`);
    assert.match(src, /import \{ accountScope \} from "@\/lib\/accountScoped";/, `${name}: uses accountScope`);
    assert.match(src, /accountScope\(getSessionGeneration\)/, `${name}: starts a scope when the request starts`);
    assert.ok((src.match(/scope\.isStale\(\)/g) || []).length >= 2, `${name}: checks the scope after awaiting`);
    assert.match(src, /cacheSetFor\("[a-z:-]+", [a-zA-Z.]+, userId\);\s*\n\s*\}, \[[a-zA-Z]+, loading, userId\]\);/, `${name}: the cache-in-step effect names the user from context and re-runs when it changes`);
    assert.match(src, /cacheSetFor\("[a-z:-]+", [\s\S]*?, uid\)/, `${name}: the fetch result is stored under the user that asked`);
  }
});

test("tab pages: a stale result returns before any state update or cache write", () => {
  const leads = read("app/dashboard/leads/page.tsx");
  const afterQuery = leads.slice(leads.indexOf("const { data, error } = await supabase"));
  assert.ok(afterQuery.indexOf("if (scope.isStale()) return;") < afterQuery.indexOf("setLeads(data)"), "leads: stale check precedes setLeads");
  const showings = read("app/dashboard/showings/page.tsx");
  const s2 = showings.slice(showings.indexOf("const [showingsRes, listingsRes] = await Promise.all"));
  assert.ok(s2.indexOf("if (scope.isStale()) return;") < s2.indexOf("setShowings(rows)"), "showings: stale check precedes setShowings");
  const offers = read("app/dashboard/offers/page.tsx");
  assert.match(offers, /if \(!active \|\| scope\.isStale\(\)\) return;[^\n]*\n\s*if \(!offersRes\.error/, "offers: stale check precedes setOffers");
  const sp = read("app/dashboard/seller-prospects/page.tsx");
  const s3 = sp.slice(sp.indexOf("const load = async () => {"));
  assert.ok(s3.indexOf("if (scope.isStale()) return; // the account changed") < s3.indexOf("setProspects(rows as SellerProspect[])"), "seller prospects: stale check precedes the direct-read update");
  assert.ok(s3.lastIndexOf("if (scope.isStale()) return;") > s3.indexOf("await res.json()"), "seller prospects: the API fallback is checked too");
});

test("layout: the page, the realtime alerts and the command palette are remounted when the account changes", () => {
  const layout = read("app/dashboard/layout.tsx");
  assert.match(layout, /<main key=\{sessionEpoch\} /);
  assert.match(layout, /<LiveLeadAlerts key=\{`alerts-\$\{sessionEpoch\}`\} \/>/);
  assert.match(layout, /<CommandPalette key=\{`palette-\$\{sessionEpoch\}`\} \/>/);
});

test("realtime alerts: channels come from the account-bound helper, every callback checks isCurrent(), and teardown goes through it", () => {
  const src = read("components/LiveLeadAlerts.tsx");
  assert.match(src, /openAccountChannels<Channel>\(/);
  assert.equal((src.match(/supabase\s*\n?\s*\.channel\(/g) || []).length, 3, "the three channels are all created inside open()");
  assert.equal((src.match(/if \(!isCurrent\(\)\) return;/g) || []).length, 3, "each of the three callbacks ignores old-account events");
  assert.match(src, /return \(\) => binding\.stop\(\);/);
  assert.ok(!/let (lead|showing|message)Channel/.test(src), "no loose channel variables that cleanup could miss");
});

test("no test above reached the network", () => {
  assertNoNetworkAttempts();
});
