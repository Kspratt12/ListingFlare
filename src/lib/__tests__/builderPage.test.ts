import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = process.env.LF_SRC_DIR as string;
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8").replace(/\r\n/g, "\n");

// First capture group of every match of re in text.
function all(re: RegExp, text: string): string[] {
  const out: string[] = [];
  const g = new RegExp(re.source, "g");
  let m: RegExpExecArray | null;
  while ((m = g.exec(text))) out.push(m[1]);
  return out;
}

test("builder page shows real screenshots of the public demo, labeled as a demonstration, with a demo link", () => {
  const page = read("app/single-property-website-builder/page.tsx");
  assert.match(page, /See an actual ListingFlare listing page/);
  assert.match(page, /a demonstration, not a customer listing/);
  assert.match(page, /cta: \{ href: "\/demo"/);
  const srcs = all(/src: "(\/images\/builder\/[^"]+)"/, page);
  assert.equal(srcs.length, 2);
  for (const s of srcs) {
    const file = path.join(SRC, "..", "public", s);
    assert.ok(fs.existsSync(file), `${s} exists`);
    assert.ok(fs.statSync(file).size > 10000, `${s} is a real image`);
  }
  // every figure has descriptive alt text and explicit dimensions
  const alts = all(/alt: "([^"]+)"/, page).filter((a) => a.length > 40);
  assert.equal(alts.length, 2);
  assert.equal((page.match(/width: 1282,/g) || []).length, 2);
  assert.equal((page.match(/height: 633,/g) || []).length, 2);
  // no customer or result claims attached to the sample
  assert.doesNotMatch(page, /customer (result|example|story)|case study|testimonial/i);
});

test("the shared landing component renders figures with next/image and captions", () => {
  const c = read("components/SeoLandingPage.tsx");
  assert.match(c, /import Image from "next\/image"/);
  assert.match(c, /figures\.items\.map/);
  assert.match(c, /<figcaption/);
});

test("relevant articles link to the builder page with descriptive anchors", () => {
  const expected: Array<[string, RegExp]> = [
    ["content/articles/single-property-website-vs-zillow-showcase.ts", /<a href="\/single-property-website-builder">single property website builder<\/a>/],
    ["content/articles/single-property-website-cost.ts", /<a href="\/single-property-website-builder">ListingFlare single property website builder<\/a>/],
    ["content/articles/real-estate-agent-website-examples.ts", /<a href="\/single-property-website-builder">single property website builder<\/a>/],
    ["content/articles/cribflyer-vs-rela-vs-listingflare.ts", /<a href="\/single-property-website-builder">ListingFlare single property website builder<\/a>/],
    ["content/articles/how-to-create-single-property-website.ts", /<a href="\/single-property-website-builder">ListingFlare<\/a>, for example/],
    ["content/articles/best-single-property-website-builders.ts", /<a href="\/single-property-website-builder">ListingFlare<\/a><\/strong> - Best overall/],
  ];
  for (const [f, re] of expected) assert.match(read(f), re, f);
  assert.ok(fs.existsSync(path.join(SRC, "app/single-property-website-builder/page.tsx")));
});

test("homepage and pricing meta descriptions are search-result length and make no unconditional instant-reply promise", () => {
  const layout = read("app/layout.tsx");
  const home = all(/description:\s*\n\s*"(Single-property websites with an AI assistant[^"]+)"/, layout);
  assert.equal(home.length, 1, "homepage description present");
  assert.ok(home[0].length <= 160, `homepage description is ${home[0].length} chars`);
  const pricing = read("app/pricing/page.tsx");
  const descs = all(/"(\$150\/month for unlimited listing websites[^"]+)"/, pricing);
  assert.equal(descs.length, 3);
  for (const d of descs) assert.ok(d.length <= 160, `pricing description is ${d.length} chars`);
  for (const f of ["app/layout.tsx", "app/pricing/page.tsx", "app/HomeClient.tsx"]) {
    assert.doesNotMatch(read(f), /instant AI reply|reply to new leads instantly|instant lead capture/i, f);
  }
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
