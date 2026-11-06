import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Social-preview title consistency, structured-data accuracy, and the dashboard's small controls (phone widths).
// Text checks on source. They make no claim about search ranking, and nothing here is a Search Console result.

const SRC = process.env.LF_SRC_DIR as string;
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const str = (text: string, re: RegExp) => { const m = re.exec(text); assert.ok(m, "not found: " + re); return m![1]; };

test("homepage: the Open Graph and Twitter titles equal the page <title>", () => {
  const layout = read("app/layout.tsx");
  const title = str(layout, /title: \{\s*default: "([^"]+)"/);
  assert.equal(str(layout, /openGraph: \{[\s\S]*?title: "([^"]+)"/), title);
  assert.equal(str(layout, /twitter: \{[\s\S]*?title: "([^"]+)"/), title);
});

test("/blog: the Open Graph title equals the rendered <title> (page title + the site template), and the working og:image URL is untouched", () => {
  const blog = read("app/blog/page.tsx");
  const meta = blog.slice(blog.indexOf("export const metadata"));
  const pageTitle = str(meta, /^\s*title: "([^"]+)"/m);
  assert.equal(str(meta, /openGraph: \{\s*title: "([^"]+)"/), `${pageTitle} | ListingFlare`);
  assert.match(meta, /images: \[\{ url: "\/opengraph-image", width: 1200, height: 630/);
  assert.match(read("app/layout.tsx"), /template: "%s \| ListingFlare"/);
});

test("structured data: the software description and feature list make no claim the product does not deliver; the FAQ markup comes from the visible FAQ; no ratings or reviews are invented", () => {
  const home = read("app/HomeClient.tsx");
  const ld = home.slice(home.indexOf('"@type": "SoftwareApplication"'), home.indexOf("const faqs = ["));
  assert.ok(!/follow-?up/i.test(ld), "no follow-up claim in the SoftwareApplication markup");
  assert.match(ld, /"AI-drafted replies to new leads"/);
  assert.ok(home.includes("mainEntity: faqs.map((faq) =>"), "FAQPage markup is generated from the same faqs array the page renders");
  assert.ok(!/aggregateRating|ratingValue|reviewCount|"@type": "Review"/.test(home), "no rating or review markup");
  assert.ok(!/follow-?up sequence|automate follow-?up|automated follow-?up/i.test(home.slice(home.indexOf("const faqs = ["), home.indexOf("const faqJsonLd"))), "FAQ answers carry no gated claim");
});

test("dashboard small controls grow on phones only: dismiss button, status filter chips and the mobile status select", () => {
  const banner = read("components/ClickToTextAnnouncement.tsx");
  assert.match(banner, /aria-label="Dismiss"/);
  assert.match(banner, /onClick=\{dismiss\}/); // behaviour preserved
  const dismiss = str(banner, /<button\s+onClick=\{dismiss\}\s+aria-label="Dismiss"\s+className="([^"]+)"/);
  assert.match(dismiss, /\bh-11 w-11\b/); // 44px on phones
  assert.match(dismiss, /\bmd:h-7 md:w-7\b/); // small again from md
  assert.match(dismiss, /focus-visible:ring-2/); // visible keyboard focus
  const leads = read("app/dashboard/leads/page.tsx");
  const chip = "inline-flex min-h-[40px] items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors md:min-h-0";
  assert.equal(leads.split(chip).length - 1, 2, "both status filter chips (all, and each status)");
  const select = "min-h-[44px] appearance-none rounded-full border py-1 pl-2.5 pr-6 text-xs font-medium cursor-pointer md:min-h-0";
  assert.equal(leads.split(select).length - 1, 1, "the phone card's status select");
  assert.match(leads, /onChange=\{\(e\) => updateLeadStatus\(lead\.id, e\.target\.value\)\}/); // behaviour preserved
});

assertNoNetworkAttempts();
