// ACTUAL-COMPONENT tests (server-rendered markup, fictional data; see _componentHarness.ts for the
// evidence class and harness substitutions): the flyer in every layout, More listings, and the
// custom-domain card. Not a browser: no effects, printing or layout measurement.
import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { createHarness, type Component } from "./_componentHarness";
import { DEFAULT_FLYER_OPTIONS, sanitizeFlyerOptions } from "../flyerOptions";

const H = createHarness("marketing");
const Flyer = H.load("components/OpenHouseFlyer.tsx") as Component;
const OtherListings = H.load("components/OtherListings.tsx") as Component;
const CustomDomainCard = H.load("components/CustomDomainCard.tsx") as Component;

const data = (over: Record<string, unknown> = {}) => ({
  listing: {
    id: "00000000-0000-4000-8000-000000000001", slug: "1-fictional-way", street: "1 Fictional Way", city: "Exampleville", state: "NC", zip: "27000",
    price: 450000, beds: 3, baths: 2, sqft: 1800, year_built: 2001, lot_size: "", description: "A fictional description.", features: ["Porch", "Garage"],
    photos: [{ src: "https://images.unsplash.com/photo-test-1", alt: "front" }, { src: "https://images.unsplash.com/photo-test-2", alt: "kitchen" }],
    brand_color: null, ...over,
  },
  agent: { id: "a", handle: "fictional", name: "Fiction Agent", title: "Agent", brokerage: "Example Realty", phone: "5555550100", email: "agent@example.invalid",
    headshot_url: "https://images.unsplash.com/photo-headshot", brand_color: "#b8860b", license_number: "X1" },
  listingUrl: "https://www.listingflare.com/listing/1-fictional-way?src=flyer",
  qrDataUrl: "data:image/png;base64,LISTINGQR",
  signInUrl: "https://www.listingflare.com/open-house/00000000-0000-4000-8000-000000000001",
  signInQrDataUrl: "data:image/png;base64,SIGNINQR",
});

for (const layout of ["classic", "modern", "minimal"] as const) {
  test(`flyer (${layout}): renders the saved facts, headline, date and chosen QR`, () => {
    const options = sanitizeFlyerOptions({ ...DEFAULT_FLYER_OPTIONS, layout, headline: "Just Listed", eventDate: "2026-11-21", startTime: "13:00", endTime: "16:00", customText: "Park on Elm St.", qrTarget: "signin" });
    const html = H.h(Flyer, { data: data(), options });
    assert.match(html, /Just Listed/);
    assert.match(html, /Saturday, November 21 · 1 – 4 PM/);
    assert.match(html, /\$450,000/);
    assert.match(html, /1 Fictional Way/);
    assert.match(html, /Park on Elm St\./);
    assert.match(html, /SIGNINQR/);
    assert.ok(!/LISTINGQR/.test(html), "only the chosen QR is printed");
    assert.match(html, /Scan to sign in/);
    assert.match(html, /Fiction Agent/);
    assert.match(html, /License #X1/);
  });

  test(`flyer (${layout}): blank facts are not printed as zero, and hidden parts stay hidden`, () => {
    const options = sanitizeFlyerOptions({ layout, showAgentPhoto: false, showDescription: false, showFeatures: false });
    const html = H.h(Flyer, { data: data({ beds: 0, baths: 0, sqft: 0, year_built: null, price: 0 }), options });
    assert.ok(!/>0</.test(html), "no bare zero values");
    assert.ok(!/Beds|Baths|Sq Ft/.test(html), "no spec labels without values");
    assert.ok(!/photo-headshot/.test(html), "headshot hidden");
    assert.ok(!/A fictional description\./.test(html), "description hidden");
    assert.ok(!/Garage/.test(html), "features hidden");
    assert.ok(!/\$0/.test(html), "no $0 price");
    assert.match(html, /LISTINGQR/);
    assert.match(html, /Scan for photos &amp; details/);
  });
}

test("flyer: a listing color, then the agent color, is used when no preset color is chosen", () => {
  assert.match(H.h(Flyer, { data: data({ brand_color: "#123456" }), options: DEFAULT_FLYER_OPTIONS }), /#123456/);
  assert.match(H.h(Flyer, { data: data(), options: DEFAULT_FLYER_OPTIONS }), /#b8860b/);
  assert.match(H.h(Flyer, { data: data(), options: sanitizeFlyerOptions({ accent: "#065f46" }) }), /#065f46/);
});

test("More listings: cards link to each listing, badge non-standard statuses, and render nothing when empty", () => {
  const l = (id: string, status: string, over: Record<string, unknown> = {}) => ({ id, slug: `slug-${id}`, status, street: `${id} Street`, city: "C", state: "NC", price: 300000, beds: 2, baths: 1, sqft: 900, photos: [], ...over });
  const html = H.h(OtherListings, { listings: [l("a", "published"), l("b", "pending"), l("c", "coming_soon", { price: 0, beds: 0, baths: 0, sqft: 0 })], agentName: "Fiction Agent", profileHref: "/agent/fictional" });
  assert.match(html, /More listings from this agent/);
  assert.match(html, /href="\/listing\/slug-a"/);
  assert.match(html, /href="\/agent\/fictional"/);
  assert.match(html, />Pending</);
  assert.match(html, />Coming soon</);
  assert.match(html, /Price on request/);
  assert.equal(H.h(OtherListings, { listings: [], agentName: "x", profileHref: "/agent/x" }), "");
});

test("custom domain card: before the server answers it shows loading, not a connect form or a connected state", () => {
  // Availability comes from GET /api/domains (server-side flag + provider credentials), so the first
  // render must not offer to connect or claim anything is connected.
  const html = H.h(CustomDomainCard, { handle: "fictional" });
  assert.match(html, /Loading/);
  assert.ok(!/Connect domain|Connected|DNS records needed/.test(html));
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
