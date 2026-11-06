import fs from "node:fs";
import path from "node:path";
import { createHarness } from "./_componentHarness";
import { installMiniDom, MEvent, type MElement } from "./_miniDom";
import { createFakeBackend, type FakeBackend } from "./_fakeBackend";

// Mounts the REAL dashboard layout, the REAL listings page, the REAL live-alerts and command-palette components, and the
// REAL session/cache code with react-dom, on the minimal DOM in _miniDom.ts, against the fake backend in _fakeBackend.ts.
//
// HARNESS SUBSTITUTIONS (everything not listed is the real source, compiled as in _componentHarness.ts):
//  M1  @/lib/supabase/client is replaced by the fake backend (no real auth service or database).
//  M2  next/link, next/navigation and lucide-react are replaced by trivial stand-ins (an <a>, a fixed pathname with a recording
//      router, and icons that render nothing). Routing and icons are not under test.
//  M3  The listings page's widgets and modals (UpcomingShowings, ActivityFeed, SpeedToLead, GettingStarted, DailyBriefing,
//      PushNotificationPrompt, RevenueStat, FlyerModal, UpgradePrompt) render nothing, and ListingActionsMenu is a stand-in that
//      renders one marker per listing and records the props the page passes it (so tests can call the page's real handlers).
//  M4  The DOM is the minimal one in _miniDom.ts. Nothing here runs in a browser.
//  Tabs that can be mounted: the listings page and the offers page (both real); the other tabs are not mounted by these tests.
// Modules are re-evaluated for every world, so each test starts with a fresh session manager and a fresh cache.

const h = createHarness("mounted");
const { srcDir, nodeRequire, React, compile } = h;
const dom = installMiniDom();
const { createRoot } = nodeRequire("react-dom/client") as { createRoot: (el: unknown) => { render: (n: unknown) => void; unmount: () => void } };
const { act } = nodeRequire("react-dom/test-utils") as { act: (fn: () => unknown) => Promise<void> };
const outDir = path.join(path.resolve(srcDir, ".."), "node_modules", ".cache", "lf-component-render-mounted");

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const nullComponent = () => null;
// Node keys its module cache by REAL path (node_modules is a junction in this worktree), so stub keys are resolved the same way.
const stub = (file: string, exports: unknown) => {
  const key = fs.realpathSync(file);
  nodeRequire.cache[key] = { id: key, filename: key, loaded: true, exports } as unknown as NodeJS.Module;
};

export interface MenuProps {
  listing: Record<string, unknown>;
  onDuplicate: (e: unknown, listing: Record<string, unknown>) => Promise<void> | void;
  onArchive: (e: unknown, id: string) => unknown;
}

export function mountWorld(opts: { firstUser: string | null; strict?: boolean; page?: "listings" | "offers" | "none"; only?: "palette" }) {
  compile(path.join(srcDir, "app/dashboard/layout.tsx")); // makes sure the compiled output folder exists
  const realOut = fs.realpathSync(outDir);
  for (const k of Object.keys(nodeRequire.cache)) if (k.startsWith(realOut)) delete nodeRequire.cache[k];
  const backend: FakeBackend = createFakeBackend(opts.firstUser);
  const routerCalls: string[] = [];
  const menuProps = new Map<string, MenuProps>();

  stub(compile(path.join(srcDir, "lib/supabase/client.ts")), { createClient: () => backend.client });
  stub(nodeRequire.resolve("next/link"), { __esModule: true, default: (p: { href?: string; children?: unknown }) => React.createElement("a", { href: p.href }, p.children as never) });
  // one router object for the whole world, as in the app (a new object on every call would re-run effects that depend on it)
  const router = { push: (u: string) => routerCalls.push(u), refresh: () => {}, replace: () => {} };
  stub(nodeRequire.resolve("next/navigation"), { usePathname: () => "/dashboard", useRouter: () => router });
  stub(nodeRequire.resolve("lucide-react"), new Proxy({ __esModule: true }, { get: (t, k) => (k === "__esModule" ? true : nullComponent) }));
  for (const rel of ["UpcomingShowings", "ActivityFeed", "SpeedToLead", "GettingStarted", "DailyBriefing", "PushNotificationPrompt", "RevenueStat", "FlyerModal", "UpgradePrompt"]) {
    stub(compile(path.join(srcDir, `components/${rel}.tsx`)), { __esModule: true, default: nullComponent });
  }
  stub(compile(path.join(srcDir, "components/ListingActionsMenu.tsx")), {
    __esModule: true,
    default: (p: MenuProps) => {
      menuProps.set(String(p.listing.id), p);
      return React.createElement("button", { "data-actions": String(p.listing.id) }, `actions:${p.listing.id}`);
    },
  });

  const Layout = nodeRequire(compile(path.join(srcDir, "app/dashboard/layout.tsx"))).default;
  const pageFile = opts.page === "offers" ? "app/dashboard/offers/page.tsx" : "app/dashboard/page.tsx";
  const Page = nodeRequire(compile(path.join(srcDir, pageFile))).default;
  const swr = nodeRequire(compile(path.join(srcDir, "lib/swrCache.ts"))) as { getCacheOwner: () => string | null; cacheGet: <T>(k: string) => T | undefined };
  const session = nodeRequire(compile(path.join(srcDir, "lib/agentSession.tsx"))) as { peekLocalUserId: () => string | null; getSessionGeneration: () => number };

  const container = dom.document.createElement("div") as MElement;
  dom.document.body.appendChild(container);
  const root = createRoot(container);
  const Palette = nodeRequire(compile(path.join(srcDir, "components/CommandPalette.tsx"))).default;
  // `only: "palette"` mounts the command palette ALONE (no layout, so no key-based remount) to test its own stale-result guard.
  let tree: unknown = opts.only === "palette" ? React.createElement(Palette) : React.createElement(Layout, null, opts.page === "none" ? null : React.createElement(Page));
  if (opts.strict) tree = React.createElement(React.StrictMode, null, tree as never);

  // Standard fake data the layout needs to settle.
  backend.handlers.agent_profiles = (q) => ({ data: { id: q.filters.id, name: "Fictional Agent", subscription_status: "active", trial_ends_at: null, brand_color: "#b8965a" }, error: null });
  backend.handlers.leads = () => ({ data: null, error: null, count: 0 });

  return {
    backend,
    container,
    routerCalls,
    menuProps,
    swr,
    session,
    text: () => container.textContent,
    mount: () => act(async () => { root.render(tree); await sleep(0); }),
    // Lets queued work run: timers (including the deferred session notifications), promises, effects and re-renders.
    settle: (ms = 20) => act(async () => { await sleep(ms); }),
    run: <T,>(fn: () => T) => act(async () => { fn(); }),
    // Like run, for a body that must keep awaiting inside the same act scope (microtasks only: no timer can fire meanwhile).
    runAsync: (fn: () => Promise<void>) => act(fn),
    act: (fn: () => Promise<void>) => act(fn),
    // Ctrl+K, which toggles the command palette (the palette listens on window).
    togglePalette: () => act(async () => { dom.dispatchWindowEvent(Object.assign(new MEvent("keydown"), { ctrlKey: true, metaKey: false, key: "k" })); }),
    unmount: () => act(async () => { root.unmount(); }),
  };
}
export type World = ReturnType<typeof mountWorld>;
