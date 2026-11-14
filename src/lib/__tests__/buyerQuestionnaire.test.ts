import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getAllPosts } from "../blog";
import { TEMPLATES } from "@/content/templates";

const SRC = process.env.LF_SRC_DIR as string;
const PUBLIC = path.join(SRC, "..", "public");
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
    else if (href.startsWith("/downloads/")) assert.ok(fs.existsSync(path.join(PUBLIC, href)), "download exists: " + href);
    else assert.ok(fs.existsSync(path.join(SRC, "app", href.replace(/^\//, ""), "page.tsx")), "page exists: " + href);
  }
}

test("buyer questionnaire guide: registered, indexable, well-formed, FAQ block, real cover image, links resolve", () => {
  const p = post("real-estate-buyer-questionnaire");
  assert.ok(!p.noindex);
  assert.ok(p.title.length <= 65, `title is ${p.title.length} chars`);
  assert.ok(p.description.length >= 70 && p.description.length <= 165, `description is ${p.description.length} chars`);
  assert.ok(fs.existsSync(path.join(PUBLIC, p.coverImage)));
  const faq = p.content.match(/<div[^>]*class="faq-section"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(faq);
  assert.ok((faq![1].match(/<h3>/g) || []).length >= 5);
  assert.doesNotMatch(p.content, /—/);
  assert.doesNotMatch(p.content, /guarantee(d)? (leads|sales|results)|\b\d{2,3}% (more|higher)\b/i);
  checkLinks(p.content);
});

test("buyer questionnaire template: registered with three files that exist, and says to avoid protected characteristics", () => {
  const t = TEMPLATES.find((x) => x.id === "real-estate-buyer-questionnaire-template");
  assert.ok(t);
  assert.equal(t!.guideHref, "/blog/real-estate-buyer-questionnaire");
  assert.equal(t!.files.length, 3);
  for (const f of t!.files) assert.ok(fs.existsSync(path.join(PUBLIC, f.href)), f.href);
  const script = fs.readFileSync(path.join(SRC, "..", "scripts", "build-templates.mjs"), "utf8");
  assert.match(script, /Do not ask about or record anything related to race, color, religion, sex, national origin, disability or family status/);
  assert.match(post("real-estate-buyer-questionnaire").content, /Do not ask about or record race, color, religion, sex, national origin, disability or family status/);
});

test("lead follow-up tracker: spreadsheet version is registered and exists", () => {
  const t = TEMPLATES.find((x) => x.id === "lead-follow-up-tracker");
  assert.ok(t);
  const x = t!.files.find((f) => f.href.endsWith(".xlsx"));
  assert.ok(x, "xlsx registered");
  assert.ok(fs.existsSync(path.join(PUBLIC, x!.href)));
});

test("best AI tools: covers other agent tools with working links, a new FAQ, and keeps its title", () => {
  const p = post("best-ai-tools-for-realtors");
  assert.equal(p.title, "Best AI Tools for Realtors (2026): 10 Picks for Agents");
  assert.equal(p.updated, "2026-11-14");
  assert.match(p.description, /real estate agent tools/);
  assert.ok(p.description.length >= 70 && p.description.length <= 165);
  assert.match(p.content, /<h2>Beyond AI: Other Real Estate Agent Tools to Consider<\/h2>/);
  assert.match(p.content, /<h3>What are the best tools for real estate agents\?<\/h3>/);
  checkLinks(p.content);
});

test("lead scoring and flyer pages carry the new FAQ entries inside the structured-data block", () => {
  const ls = post("lead-scoring-criteria-real-estate-agents").content;
  const lsFaq = ls.match(/<div[^>]*class="faq-section"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(lsFaq);
  assert.match(lsFaq![1], /What is lead scoring and should real estate agents use it\?/);
  const fl = post("open-house-flyer-template");
  const flFaq = fl.content.match(/<div[^>]*class="faq-section"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(flFaq);
  assert.match(flFaq![1], /Can I use this as a property flyer or just listed flyer template\?/);
  assert.match(fl.content, /works as a property flyer or a just listed flyer too/);
  assert.ok(fl.keywords.includes("property flyer template") && fl.keywords.includes("just listed flyer template"));
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
