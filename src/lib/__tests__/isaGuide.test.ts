import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getAllPosts } from "../blog";

const SRC = process.env.LF_SRC_DIR as string;
const PUBLIC = path.join(SRC, "..", "public");
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const posts = getAllPosts();
const post = (slug: string) => {
  const p = posts.find((x) => x.slug === slug);
  assert.ok(p, slug + " is registered");
  return p!;
};

function all(re: RegExp, text: string): string[] {
  const out: string[] = [];
  const g = new RegExp(re.source, "g");
  let m: RegExpExecArray | null;
  while ((m = g.exec(text))) out.push(m[1]);
  return out;
}

function checkLinks(content: string) {
  const slugs = new Set(posts.map((x) => x.slug));
  for (const href of all(/href="(\/[^"#?]*)"/, content)) {
    if (href.startsWith("/blog/")) assert.ok(slugs.has(href.replace("/blog/", "")), "article exists: " + href);
    else assert.ok(fs.existsSync(path.join(SRC, "app", href.replace(/^\//, ""), "page.tsx")), "page exists: " + href);
  }
}

test("ISA explainer: registered, indexable, well-formed, own cover image, FAQ block, links resolve", () => {
  const p = post("what-is-a-real-estate-isa");
  assert.ok(!p.noindex);
  assert.ok(p.title.length <= 65, `title is ${p.title.length} chars`);
  assert.ok(p.description.length >= 70 && p.description.length <= 165, `description is ${p.description.length} chars`);
  assert.equal(p.coverImage, "/blog/what-is-a-real-estate-isa/hero.jpg");
  assert.equal(posts.filter((x) => x.coverImage === p.coverImage).length, 1, "cover is used by one article");
  assert.ok(fs.existsSync(path.join(PUBLIC, p.coverImage)));
  const faq = p.content.match(/<div[^>]*class="faq-section"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(faq);
  assert.ok((faq![1].match(/<h3>/g) || []).length >= 5);
  assert.doesNotMatch(p.content, /—/);
  assert.doesNotMatch(p.content, /guarantee(d)? (leads|sales|results)|\b\d{2,3}% (more|higher)\b/i);
  checkLinks(p.content);
});

test("ISA explainer: describes ListingFlare accurately (answers from entered details, no outbound calls or automated texts, approval mode)", () => {
  const c = post("what-is-a-real-estate-isa").content;
  assert.match(c, /answers buyer questions from the listing details you enter/);
  assert.match(c, /unless you turn on approval mode/);
  assert.match(c, /does not make outbound calls or send automated texts/);
  assert.match(c, /general guidance, not legal advice/);
  assert.doesNotMatch(c, /instant|replaces? (an|your) ISA entirely/i);
});

test("the AI ISA tools comparison links to the explainer", () => {
  assert.match(post("best-ai-isa-tools-real-estate").content, /href="\/blog\/what-is-a-real-estate-isa"/);
});

test("listings article: 30-day plan section, FAQ entry, description mentions getting listings, links resolve", () => {
  const p = post("how-to-win-more-listings-as-a-real-estate-agent");
  assert.equal(p.title, "How to Win More Listings as a Real Estate Agent");
  assert.equal(p.updated, "2026-11-14");
  assert.match(p.description, /get more listings/);
  assert.ok(p.description.length >= 70 && p.description.length <= 165);
  assert.match(p.content, /<h2>How to Get Listings: A 30-Day Starter Plan<\/h2>/);
  const faq = p.content.match(/<div[^>]*class="faq-section"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(faq);
  assert.match(faq![1], /How do I get listings as a real estate agent\?/);
  checkLinks(p.content);
});

test("builder page: listing software wording stays accurate (marketing software, no MLS syndication)", () => {
  const page = read("app/single-property-website-builder/page.tsx");
  assert.match(page, /question: "Is ListingFlare real estate listing software\?"/);
  assert.match(page, /ListingFlare is listing marketing software: it builds a page for each listing and captures inquiries\. It does not syndicate your listing to the MLS or to portals\./);
  assert.match(page, /title: "Single Property Website Builder for Agents",/);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
