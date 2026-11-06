import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHarness } from "./_componentHarness";

// The REAL PublicMobileMenu rendered to server-side HTML (react-dom/server) with no data. Evidence class: markup only.
// NOT exercised: a browser, touch, focus movement, the Escape/outside-press handlers (effects do not run in server rendering).

const { srcDir, nodeRequire, React, renderToStaticMarkup, compile } = createHarness("publicnav");
const mod = nodeRequire(compile(path.join(srcDir, "components/PublicMobileMenu.tsx"))) as {
  default: (p: { defaultOpen?: boolean }) => React.ReactElement;
  PUBLIC_NAV_LINKS: ReadonlyArray<{ href: string; label: string }>;
};
const render = (defaultOpen?: boolean) => renderToStaticMarkup(React.createElement(mod.default, { defaultOpen }));

test("menu closed: a labelled button with aria-expanded=false controls a real, hidden panel holding the three existing links", () => {
  const html = render(false);
  assert.match(html, /class="relative md:hidden"/); // never shown at md and up
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-label="Open menu"/);
  const controls = /aria-controls="([^"]+)"/.exec(html)?.[1];
  assert.ok(controls, "aria-controls present");
  assert.ok(html.includes(`id="${controls}"`), "the controlled panel exists in the markup");
  assert.match(html, new RegExp(`id="${controls!.replace(/[:]/g, "\\:")}"[^>]*hidden=""`)); // hidden while closed
  const hrefs = Array.from(html.matchAll(/<a [^>]*href="([^"]+)"/g)).map((m) => m[1]);
  assert.deepEqual(hrefs, ["/blog", "/pricing", "/demo"]);
  assert.deepEqual(mod.PUBLIC_NAV_LINKS.map((l) => l.label), ["Blog", "Pricing", "Live Demo"]);
});

test("menu open: aria-expanded=true, the close label, and the panel is no longer hidden", () => {
  const html = render(true);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /aria-label="Close menu"/);
  const controls = /aria-controls="([^"]+)"/.exec(html)![1];
  const panelTag = new RegExp(`<div id="${controls.replace(/[:]/g, "\\:")}"[^>]*>`).exec(html)![0];
  assert.ok(!/\bhidden=/.test(panelTag), "panel not hidden when open");
});

test("every menu link and the button are at least 44px tall by their classes (phone use)", () => {
  const html = render(true);
  assert.match(html, /h-11 w-11/); // 44px button
  assert.equal(Array.from(html.matchAll(/min-h-\[44px\]/g)).length, 3);
});

test("the homepage header keeps its desktop links unchanged and mounts the menu; both lists name the same destinations", () => {
  const src = fs.readFileSync(path.join(process.env.LF_SRC_DIR as string, "app/HomeClient.tsx"), "utf8").replace(/\r\n/g, "\n");
  const nav = src.slice(src.indexOf('<nav className="fixed'), src.indexOf("</nav>"));
  const desktop = Array.from(nav.matchAll(/<Link\s+href="([^"]+)"\s+className="hidden[^"]*md:block"/g)).map((m) => m[1]);
  assert.deepEqual(desktop, ["/blog", "/pricing", "/demo"], "desktop links are still hidden below md and shown from md");
  assert.deepEqual(desktop, mod.PUBLIC_NAV_LINKS.map((l) => l.href), "the menu offers exactly the same destinations");
  assert.ok(nav.includes("<PublicMobileMenu />"));
});

assertNoNetworkAttempts();
