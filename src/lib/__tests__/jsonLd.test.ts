import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { serializeJsonLd } from "../jsonLd";

// What this file covers, by kind:
//  1. HELPER tests: serializeJsonLd called directly.
//  2. PATTERN render test: the same <script dangerouslySetInnerHTML> shape the pages use,
//     rendered with the project's React. It does NOT render the real listing or city page
//     (those are large client/server components that the test runner, which transpiles
//     plain .ts files only, cannot load).
//  3. SOURCE guard tests: read the page sources and check how they call the helper.
// Nothing here touches a network, a database or a provider.

const srcDir = process.env.LF_SRC_DIR as string;
const read = (rel: string) => fs.readFileSync(path.join(srcDir, rel), "utf8").replace(/\r/g, "");

const render = (json: string) =>
  ReactDOMServer.renderToStaticMarkup(
    React.createElement("script", { type: "application/ld+json", dangerouslySetInnerHTML: { __html: json } })
  );
const closingTags = (html: string) => (html.match(/<\/script/gi) || []).length;

// ---------- 1. helper ----------

test("helper: a script-closing string cannot end the element", () => {
  const out = serializeJsonLd({ description: "Nice home</script><script>alert(1)</script>" });
  assert.ok(!out.includes("<"), "no literal < remains");
  assert.match(out, /\\u003c\/script>\\u003cscript>alert\(1\)\\u003c\/script>/);
});

test("helper: mixed-case, spaced and comment-style payloads are all neutralised", () => {
  const payloads = [
    "</ScRiPt>", "</SCRIPT >", "</script\n>", "</script\t>", "<!--", "<script>", "<SCRIPT SRC=//x>", "<img src=x onerror=1>",
    "]]></script>", "<\\/script>",
  ];
  for (const p of payloads) {
    const out = serializeJsonLd({ name: p, nested: { list: [p], deeper: { v: p } } });
    assert.ok(!out.includes("<"), `literal < for ${JSON.stringify(p)}`);
    assert.equal(closingTags(render(out)), 1, `only the real closing tag for ${JSON.stringify(p)}`);
  }
});

test("helper: the raw JSON.stringify pattern WAS vulnerable (documents the defect this fixes)", () => {
  const data = { description: "x</script><script>alert(1)</script>" };
  assert.equal(closingTags(render(JSON.stringify(data))), 3, "raw serialization breaks out of the element");
  assert.equal(closingTags(render(serializeJsonLd(data))), 1, "helper keeps it inside");
});

test("helper: less-than and other special characters round-trip exactly through JSON.parse", () => {
  const nasty = [
    "a < b", "a<b>c", "5 < 10 && 10 > 5", "\"quoted\"", "back\\slash", "line\nbreak", "tab\t", "emoji \u{1F3E0}", "\u00e9 \u00fc \u4e2d\u6587",
    "</", "<", "<<<<", "\u2028\u2029", "ampersand & more", "'single'",
  ];
  const data = { "@type": "RealEstateListing", name: nasty[0], items: nasty, nested: { text: nasty.join("|") }, n: 3, ok: true, none: null };
  const parsed = JSON.parse(serializeJsonLd(data));
  assert.deepEqual(parsed, data);
});

test("helper: ordinary structured data is unchanged apart from < escaping", () => {
  const data = {
    "@context": "https://schema.org", "@type": "RealEstateListing", name: "12 Oak St, Raleigh, NC",
    offers: { "@type": "Offer", price: 450000, priceCurrency: "USD" },
    address: { "@type": "PostalAddress", streetAddress: "12 Oak St", postalCode: "27601" },
  };
  assert.equal(serializeJsonLd(data), JSON.stringify(data), "no < present, so identical to plain JSON.stringify");
});

test("helper: undefined fields stay omitted; non-serialisable input does not return undefined", () => {
  assert.equal(serializeJsonLd({ a: 1, b: undefined }), '{"a":1}');
  assert.equal(serializeJsonLd(undefined), "null");
});

// ---------- 2. pattern render test (not the real pages) ----------

test("pattern render: a listing-shaped payload renders as ONE script element and parses back", () => {
  const listing = {
    "@context": "https://schema.org", "@type": "RealEstateListing",
    name: "1 A St</script><script>document.title='x'</script>, Raleigh, NC",
    description: "Open <b>house</b> </ScRiPt><img src=x onerror=alert(1)>",
    address: { "@type": "PostalAddress", streetAddress: "1 A St</script>", addressLocality: "<script>city</script>" },
  };
  const html = render(serializeJsonLd(listing));
  assert.equal(closingTags(html), 1);
  assert.equal((html.match(/<script/gi) || []).length, 1, "exactly one opening tag");
  const inner = html.slice(html.indexOf(">") + 1, html.lastIndexOf("</script>"));
  assert.deepEqual(JSON.parse(inner), listing);
});

test("pattern render: a city-page-shaped payload (name built from a database city) is contained", () => {
  const display = "Evil</script><script>alert(1)</script> City, NC";
  const html = render(serializeJsonLd({ "@type": "CollectionPage", name: `Homes for Sale in ${display}`, url: `https://example.invalid/homes/${display}` }));
  assert.equal(closingTags(html), 1);
});

// ---------- 3. source guards ----------

const LISTING = "app/listing/[id]/ListingPageClient.tsx";
const CITY = "app/homes/[city]/page.tsx";

test("source: the listing and city pages serialise their JSON-LD with the helper, never raw JSON.stringify", () => {
  for (const rel of [LISTING, CITY]) {
    const src = read(rel);
    assert.match(src, /import \{ serializeJsonLd \} from "@\/lib\/jsonLd"/, `${rel} imports the helper`);
    assert.match(src, /__html:\s*serializeJsonLd\(jsonLd\)/, `${rel} uses it for the JSON-LD block`);
    assert.ok(!/__html:\s*JSON\.stringify\(/.test(src), `${rel} has no raw JSON.stringify script body`);
  }
});

// Every file that emits an inline JSON-LD block must be accounted for. Pages whose JSON-LD is built only
// from repository-authored constants are listed; anything new must either use the helper or be added here
// on purpose, so a data-bearing block cannot slip in unreviewed.
const STATIC_REPO_CONTENT = new Set([
  "app/about/page.tsx", "app/blog/page.tsx", "app/blog/[slug]/page.tsx", "app/free-real-estate-templates/page.tsx",
  "app/HomeClient.tsx", "app/homes/page.tsx", "components/SeoLandingPage.tsx",
]);
const DATA_BEARING = new Set([LISTING, CITY]);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

test("source: every inline JSON-LD site is either data-bearing (helper required) or a listed static-content site", () => {
  const sites = walk(srcDir)
    .filter((f) => /\.tsx?$/.test(f) && !/__tests__/.test(f) && path.basename(f) !== "jsonLd.ts")
    .map((f) => ({ rel: path.relative(srcDir, f).split(path.sep).join("/"), src: fs.readFileSync(f, "utf8").replace(/\r/g, "") }))
    .filter(({ src }) => src.includes("application/ld+json"));
  assert.ok(sites.length >= 9, "found the JSON-LD sites");
  for (const { rel, src } of sites) {
    if (DATA_BEARING.has(rel)) {
      assert.match(src, /serializeJsonLd\(/, `${rel} must use the helper`);
    } else {
      assert.ok(STATIC_REPO_CONTENT.has(rel), `${rel} emits JSON-LD but is not in the reviewed inventory: use serializeJsonLd, or add it here after checking its data is repository-authored`);
    }
  }
});

test("no test above reached the network", () => {
  assertNoNetworkAttempts();
});
