import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { visibleFacts, factsLine, publishGaps } from "../listingFacts";

test("a normal house shows everything it has", () => {
  const f = visibleFacts({ beds: 3, baths: 2.5, sqft: 1800, yearBuilt: 1998, lotSize: "0.2 acres" });
  assert.deepEqual(f, { beds: 3, baths: 2.5, sqft: 1800, yearBuilt: 1998, lotSize: "0.2 acres" });
  assert.equal(factsLine({ beds: 3, baths: 2.5, sqft: 1800 }), "3 bed · 2.5 bath · 1,800 sqft");
});

test("all-blank (stored as 0) shows nothing about beds, baths or size: land, commercial and other non-residential listings", () => {
  const f = visibleFacts({ beds: 0, baths: 0, sqft: 0, yearBuilt: 0, lotSize: "" });
  assert.deepEqual(f, { beds: null, baths: null, sqft: null, yearBuilt: null, lotSize: null });
  assert.equal(factsLine({ beds: 0, baths: 0, sqft: 0 }), "");
});

test("a studio: 0 bedrooms with a bath count or size entered keeps the stated zero (we do not label it Studio, and we do not hide it)", () => {
  assert.equal(visibleFacts({ beds: 0, baths: 1, sqft: 520 }).beds, 0);
  assert.equal(factsLine({ beds: 0, baths: 1, sqft: 520 }), "0 bed · 1 bath · 520 sqft");
  assert.equal(visibleFacts({ beds: 0, baths: 0, sqft: 600 }).beds, 0);
});

test("zero never becomes a displayed bath count or size, and land with only a lot size still shows the lot", () => {
  assert.equal(visibleFacts({ beds: 2, baths: 0, sqft: 0 }).baths, null);
  assert.equal(visibleFacts({ beds: 2, baths: 0, sqft: 0 }).sqft, null);
  assert.equal(factsLine({ beds: 2, baths: 0, sqft: 0 }), "2 bed");
  const land = visibleFacts({ beds: 0, baths: 0, sqft: 0, lotSize: "  5 acres " });
  assert.equal(land.lotSize, "5 acres");
  assert.equal(land.beds, null);
});

test("missing, null and negative inputs are handled; stored data is never modified", () => {
  const raw = { beds: 0, baths: 0, sqft: 0 };
  visibleFacts(raw);
  assert.deepEqual(raw, { beds: 0, baths: 0, sqft: 0 });
  assert.deepEqual(visibleFacts({}), { beds: null, baths: null, sqft: null, yearBuilt: null, lotSize: null });
  assert.equal(visibleFacts({ beds: null, baths: null, sqft: -5 }).sqft, null);
});

test("the separator can be a comma for metadata descriptions", () => {
  assert.equal(factsLine({ beds: 3, baths: 2, sqft: 1800 }, ", "), "3 bed, 2 bath, 1,800 sqft");
});

test("review notes: never a requirement, only information", () => {
  assert.deepEqual(publishGaps({ photoCount: 5, beds: "3", baths: "2", sqft: "1800" }), []);
  assert.equal(publishGaps({ photoCount: 0, beds: "3", baths: "2", sqft: "1800" }).length, 1);
  const all = publishGaps({ photoCount: 0, beds: "", baths: "", sqft: "" });
  assert.equal(all.length, 2);
  assert.match(all[1], /land, commercial or other/);
});

test("review notes: any one residential field filled in means no bedroom/bath/size note; '0' and blank both count as blank", () => {
  assert.equal(publishGaps({ photoCount: 1, beds: "", baths: "", sqft: "1,200" }).length, 0);
  assert.equal(publishGaps({ photoCount: 1, beds: "0", baths: "0", sqft: "0" }).length, 1);
  assert.equal(publishGaps({ photoCount: 1, beds: " ", baths: "", sqft: "" }).length, 1);
});

test("static: the create and edit forms use the non-blocking notice and never make photos, beds or baths required", () => {
  const src = process.env.LF_SRC_DIR as string;
  for (const rel of ["app/dashboard/create/page.tsx", "app/dashboard/edit/[id]/page.tsx"]) {
    const t = fs.readFileSync(path.join(src, rel), "utf8");
    assert.match(t, /PublishReviewNotice/);
    assert.match(t, /skipReview/);
    assert.doesNotMatch(t, /setError\("[^"]*(photo|bedroom|bathroom)[^"]*required/i, rel + " must not require photos or bed/bath");
  }
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
