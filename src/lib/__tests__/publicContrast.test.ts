import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// WCAG 2.x contrast (1.4.3, 4.5:1 for normal text) for the specific text/background pairs the browser review measured below that
// level, computed from the ACTUAL classes in the source and the ACTUAL palette values. Standard used: WCAG 2.x (not a Google requirement).
// Backgrounds are the solid colours the review measured against; text over photos is not covered.

const src = (rel: string) => fs.readFileSync(path.join(process.env.LF_SRC_DIR as string, rel), "utf8").replace(/\r\n/g, "\n");

const configText = (() => {
  const root = path.resolve(process.env.LF_SRC_DIR as string, "..");
  const f = ["tailwind.config.ts", "tailwind.config.js", "tailwind.config.mjs"].map((n) => path.join(root, n)).find((p) => fs.existsSync(p));
  return fs.readFileSync(f as string, "utf8");
})();
const brand: Record<string, string> = {};
Array.from(configText.slice(configText.indexOf("brand:")).split("}")[0].matchAll(/(\d{2,3}):\s*"(#[0-9a-fA-F]{6})"/g)).forEach((m) => { brand[m[1]] = m[2]; });
const TAILWIND_GRAY: Record<string, string> = { "50": "#f9fafb", "400": "#9ca3af", "500": "#6b7280", "600": "#4b5563", "950": "#030712" };
const WHITE = "#ffffff";

function hexOf(token: string): string {
  const m = /^(?:text|bg)-(brand|gray|white)(?:-(\d+))?$/.exec(token);
  if (!m) throw new Error("unknown token " + token);
  if (m[1] === "white") return WHITE;
  const v = (m[1] === "brand" ? brand : TAILWIND_GRAY)[m[2]];
  if (!v) throw new Error("no value for " + token);
  return v;
}
function lum(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const need = (label: string, fg: string, bg: string, min = 4.5) => assert.ok(ratio(fg, bg) >= min, `${label}: ${fg} on ${bg} = ${ratio(fg, bg).toFixed(2)} (needs ${min})`);
const classOf = (text: string, re: RegExp) => { const m = re.exec(text); assert.ok(m, "element not found: " + re); return m![1]; };

test("the brand palette itself is unchanged (the fixes use existing shades only)", () => {
  assert.deepEqual(brand, { "50": "#f8f7f4", "100": "#f0ede6", "200": "#ddd8c8", "300": "#c5bca3", "400": "#ac9d7e", "500": "#9a8866", "600": "#8d7958", "700": "#75634a", "800": "#615240", "900": "#504436", "950": "#2c241c" });
});

test("pricing page: the trial reassurance under the main button and both buttons' labels reach 4.5:1", () => {
  const p = src("app/pricing/page.tsx");
  const note = classOf(p, /<p className="([^"]*)">\s*14-day free trial\. No credit card required\./);
  const color = note.split(/\s+/).find((t) => t.startsWith("text-gray-"))!;
  for (const bg of [WHITE, brand["50"]]) need("reassurance", hexOf(color), bg);
  const hdr = classOf(p, /<NavAuthCta className="([^"]*)"/);
  need("header button", WHITE, hexOf(hdr.split(/\s+/).find((t) => t.startsWith("bg-brand-"))!));
  need("header button hover", WHITE, hexOf(hdr.split(/\s+/).find((t) => t.startsWith("hover:bg-brand-"))!.replace("hover:", "")));
  const cta = /rounded-full (bg-brand-\d+) px-8 py-4 text-base font-medium text-white[^"]*?hover:(bg-brand-\d+)/.exec(p);
  assert.ok(cta, "bottom CTA found");
  need("bottom button", WHITE, hexOf(cta![1]));
  need("bottom button hover", WHITE, hexOf(cta![2]));
});

test("homepage: the gold step labels and the $150/mo labels reach 4.5:1 on the backgrounds the review measured", () => {
  const h = src("app/HomeClient.tsx");
  const step = classOf(h, /<span className="([^"]*)">Step \{item\.step\}<\/span>/).split(/\s+/).find((t) => t.startsWith("text-brand-"))!;
  for (const bg of [WHITE, TAILWIND_GRAY["50"]]) need("step label", hexOf(step), bg);
  const prices: string[] = Array.from(h.matchAll(/<div className="([^"]*)">\$150\/mo<\/div>/g)).map((m) => m[1].split(/\s+/).find((t: string) => t.startsWith("text-brand-"))!);
  assert.equal(prices.length, 2);
  for (const t of prices) for (const bg of [WHITE, TAILWIND_GRAY["50"]]) need("price label", hexOf(t), bg);
});

test("homepage dark sections: the three grey lines reach 4.5:1 on the near-black background", () => {
  const h = src("app/HomeClient.tsx");
  for (const [label, re] of [
    ["open house paragraph", /<p className="([^"]*)">\s*Picture a Saturday open house/],
    ["no credit card line", /<p className="([^"]*)">\s*No credit card required to start\./],
    ["for scale line", /<p className="([^"]*)">\s*For scale: a 3% commission/],
  ] as Array<[string, RegExp]>) {
    const color = classOf(h, re).split(/\s+/).find((t) => t.startsWith("text-gray-"))!;
    need(label, hexOf(color), TAILWIND_GRAY["950"]);
  }
});

assertNoNetworkAttempts();
