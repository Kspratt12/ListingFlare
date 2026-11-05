import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { createHarness, type Component } from "./_componentHarness";

// D2 ACTUAL-COMPONENT tests: the REAL VirtualTourEmbed and the REAL public listing page rendered to server-side
// HTML with FICTIONAL data. They check which stored tour links produce an iframe and which render nothing.
//
// Evidence class: server-rendered markup. It is NOT a browser and loads no frame. Setup and the substitutions
// (H1, H2) are described in _componentHarness.ts. Requires the D2 tour policy (src/lib/tourUrl.ts).

const { load, h, iframeSrcs, ldBlocks, listingPage } = createHarness("tour");

const Embed = load("components/VirtualTourEmbed.tsx") as Component;
const embed = (src: string) => h(Embed, { src });

test("component: documented embed links render one iframe with exactly that address", () => {
  for (const good of [
    "https://my.matterport.com/show/?m=abc123",
    "https://kuula.co/share/collection/7abc?fs=1",
    "https://mls.kuu.la/share/XXXXX",
    "https://app.cloudpano.com/tours/abc",
    "https://unbranded.youriguide.com/embed/api-docs-sample/",
  ]) {
    assert.deepEqual(iframeSrcs(embed(good)), [good], good);
  }
});

test("component: unsupported stored values render no iframe and no section", () => {
  for (const bad of [
    "javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "//my.matterport.com/x", "https://evilmatterport.com/x",
    "https://matterport.com.evil.example/", "https://user:pw@my.matterport.com/", "https://my.matterport.com:8443/", "http://my.matterport.com/",
    "https://kuula.co/post/abc", "https://cloudpano.com/tours/abc", "https://app.cloudpano.com/login", "https://youriguide.com/pricing", "", "   ",
  ]) {
    assert.equal(embed(bad), "", JSON.stringify(bad));
  }
});

test("component: a legacy value with odd casing and padding renders the normalised address", () => {
  assert.deepEqual(iframeSrcs(embed("  HTTPS://My.Matterport.COM/show/?m=1  ")), ["https://my.matterport.com/show/?m=1"]);
});

test("component: the real listing page frames a documented tour link and nothing else", () => {
  const good = "https://my.matterport.com/show/?m=abc123";
  assert.equal(iframeSrcs(listingPage({ virtual_tour_url: good })).filter((s) => s === good).length, 1);
  for (const bad of ["javascript:alert(1)", "data:text/html,x", "https://evil.example/", "https://user@my.matterport.com/", "https://kuula.co/post/abc", "https://cloudpano.com/tours/abc"]) {
    const html = listingPage({ virtual_tour_url: bad });
    assert.deepEqual(iframeSrcs(html).filter((s) => s === bad || s.startsWith("javascript:") || s.includes("evil.example") || s.includes("/post/")), [], bad);
    assert.ok(!html.includes("Walk Through the Home"), `no tour section for ${bad}`);
  }
});

test("component: a duplicated listing (draft copy with the same stored link) renders like any other listing: unsupported link, no frame", () => {
  const copy = listingPage({ status: "draft", street: "1 Fictional Way (copy)", virtual_tour_url: "https://kuula.co/post/abc" });
  assert.deepEqual(iframeSrcs(copy).filter((s) => s.includes("kuula.co")), []);
  assert.ok(!copy.includes("Walk Through the Home"));
  assert.equal(ldBlocks(copy).length, 1, "the rest of the page still renders");
});

test("no component above reached the network", () => {
  assertNoNetworkAttempts();
});
