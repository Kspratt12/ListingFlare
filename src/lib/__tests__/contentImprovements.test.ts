import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { getAllPosts } from "../blog";

const posts = getAllPosts();
const get = (slug: string) => {
  const p = posts.find((x) => x.slug === slug);
  assert.ok(p, slug + " exists");
  return p!;
};

// The same extraction the article page uses to build FAQPage structured data.
function faqQuestions(html: string): string[] {
  const m = html.match(/<div[^>]*class="faq-section"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(m, "faq-section present");
  const out: string[] = [];
  const re = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/g;
  let x: RegExpExecArray | null;
  while ((x = re.exec(m![1]))) out.push(x[1].replace(/<[^>]+>/g, "").trim());
  return out;
}

const cases: Array<[string, string[], string[]]> = [
  [
    "open-house-sign-in-sheet-template",
    ["Optional Columns: Add Only What You Will Use", "Sign-In Sheet, Sign-Up Sheet, PDF or Word: Which File to Use", "Make Your Own in Word or Google Docs"],
    ["Is an open house sign-up sheet the same as a sign-in sheet?", "Can I make my own open house sign-in sheet in Word or Google Docs?"],
  ],
  [
    "real-estate-listing-presentation-template",
    ["Listing Presentation Example: A Sample 45-Minute Agenda", "Sample Wording You Can Adapt", "Before You Walk In: A Preparation Checklist"],
    ["What is an example of a listing presentation?", "Should I use the PDF or the Word version?"],
  ],
  [
    "speed-to-lead-real-estate",
    ["A Realistic Lead Response Time Target", "Examples of a Fast First Reply"],
    ["What is a good lead response time in real estate?", "How should I reply to a real estate lead?"],
  ],
];

for (const [slug, headings, faqs] of cases) {
  test(`${slug}: new sections present, FAQ entries are in the structured-data block, and the page stays indexable`, () => {
    const p = get(slug);
    assert.equal(p.updated, "2026-11-13");
    assert.ok(!p.noindex);
    for (const h of headings) assert.ok(p.content.includes(`>${h}</h`), `heading: ${h}`);
    const qs = faqQuestions(p.content);
    for (const q of faqs) assert.ok(qs.includes(q), `faq: ${q}`);
    assert.equal(new Set(qs).size, qs.length, "no duplicate FAQ questions");
    assert.ok(p.description.length >= 70 && p.description.length <= 165);
  });
}

test("added copy makes no statistical or guarantee claims", () => {
  for (const [slug] of cases) {
    const text = get(slug).content;
    assert.doesNotMatch(text, /guarantee(d)? (leads|sales|results)|\b\d{2,3}% (more|higher)\b/i);
  }
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
