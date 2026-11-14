import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getAllPosts } from "../blog";
import { TEMPLATES } from "@/content/templates";

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

const NEW = ["open-house-flyer-template", "virtual-open-house"];

for (const slug of NEW) {
  test(`${slug}: registered, indexable, well-formed, with an FAQ block and a real cover image`, () => {
    const p = post(slug);
    assert.ok(!p.noindex);
    assert.equal(posts.filter((x) => x.slug === slug).length, 1, "slug is unique");
    assert.ok(p.title.length <= 65, `title is ${p.title.length} chars`);
    assert.ok(p.description.length >= 70 && p.description.length <= 165, `description is ${p.description.length} chars`);
    assert.ok(fs.existsSync(path.join(PUBLIC, p.coverImage)), "cover image exists");
    assert.ok(p.coverImageAlt.length > 20);
    const faq = p.content.match(/<div[^>]*class="faq-section"[^>]*>([\s\S]*?)<\/div>/);
    assert.ok(faq, "faq-section present and closed before any nested div");
    assert.ok((faq![1].match(/<h3>/g) || []).length >= 5, "at least five FAQ entries");
    assert.doesNotMatch(p.content, /—/, "no em dashes");
    assert.doesNotMatch(p.content, /guarantee(d)? (leads|sales|results)|\b\d{2,3}% (more|higher)\b/i);
    assert.equal((p.content.match(/<h1/g) || []).length, 0, "the page template supplies the H1");
  });

  test(`${slug}: every internal link resolves to a real page`, () => {
    const p = post(slug);
    const slugs = new Set(posts.map((x) => x.slug));
    for (const href of all(/href="(\/[^"#?]*)"/, p.content)) {
      if (href.startsWith("/blog/")) assert.ok(slugs.has(href.replace("/blog/", "")), "article exists: " + href);
      else if (href.startsWith("/downloads/")) assert.ok(fs.existsSync(path.join(PUBLIC, href)), "download exists: " + href);
      else assert.ok(fs.existsSync(path.join(SRC, "app", href.replace(/^\//, ""), "page.tsx")), "page exists: " + href);
    }
  });
}

test("flyer template: registered with PDF, fillable PDF and Word files that exist, and embedded in its guide", () => {
  const t = TEMPLATES.find((x) => x.id === "open-house-flyer-template");
  assert.ok(t, "template registered");
  assert.equal(t!.guideHref, "/blog/open-house-flyer-template");
  assert.equal(t!.files.length, 3);
  for (const f of t!.files) assert.ok(fs.existsSync(path.join(PUBLIC, f.href)), f.href);
  assert.match(post("open-house-flyer-template").content, /downloadBox|class="[^"]*download|Download PDF/);
});

test("flyer guide describes the generator as a printable flyer whose QR opens the sign-in page, not a PDF", () => {
  const c = post("open-house-flyer-template").content;
  assert.match(c, /builds a printable flyer from a listing's details, with a QR code that opens that listing's open house sign-in page/);
  assert.doesNotMatch(c, /flyer PDF with a QR code/);
  assert.match(read("app/pricing/page.tsx"), /Open house flyer generator \(printable, with QR code\)/);
  assert.doesNotMatch(read("app/pricing/page.tsx"), /PDF with QR/);
});

test("sign-in sheet: spreadsheet version is registered, exists and is described in the guide and FAQ", () => {
  const t = TEMPLATES.find((x) => x.id === "open-house-sign-in-sheet-template");
  assert.ok(t);
  const x = t!.files.find((f) => f.href.endsWith(".xlsx"));
  assert.ok(x, "xlsx registered");
  assert.ok(fs.existsSync(path.join(PUBLIC, x!.href)));
  const c = post("open-house-sign-in-sheet-template").content;
  assert.match(c, /Excel \/ Google Sheets/);
  assert.match(c, /Is there a Google Sheets or Excel version of the open house sign-in sheet\?/);
});

test("virtual open house guide describes only verified ListingFlare capabilities", () => {
  const c = post("virtual-open-house").content;
  assert.match(c, /embed a 3D tour such as Matterport or Kuula/);
  assert.match(c, /answers questions from the listing details you entered/);
  assert.doesNotMatch(c, /registration|automatically (send|follow)|instant/i);
});

test("builder page covers 'real estate listing website' in a section and an FAQ, without changing its title", () => {
  const page = read("app/single-property-website-builder/page.tsx");
  assert.match(page, /heading: "A real estate listing website, explained"/);
  assert.match(page, /question: "What is a real estate listing website\?"/);
  assert.match(page, /title: "Single Property Website Builder for Agents",/);
});

test("lead-generation articles link to the hub guide, and the open house pages link to the new resources", () => {
  for (const slug of ["best-lead-generation-for-realtors", "how-to-get-leads-as-a-real-estate-agent", "best-lead-generation-tools-for-real-estate-agents"]) {
    assert.match(post(slug).content, /href="\/blog\/real-estate-lead-generation"/, slug);
  }
  assert.match(post("open-house-flyer-generator").content, /href="\/blog\/open-house-flyer-template"/);
  assert.match(post("open-house-checklist").content, /href="\/blog\/open-house-flyer-template"/);
  assert.match(post("open-house-checklist").content, /href="\/blog\/virtual-open-house"/);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
