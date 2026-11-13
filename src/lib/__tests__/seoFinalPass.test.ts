import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getAllPosts } from "../blog";

const SRC = process.env.LF_SRC_DIR as string;
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8").replace(/\r\n/g, "\n");

test("every article has a unique title, a unique description, and a description short enough not to be truncated in results", () => {
  const posts = getAllPosts();
  assert.ok(posts.length >= 87, "article inventory is intact");
  const titles = new Set<string>();
  const descs = new Set<string>();
  for (const p of posts) {
    assert.ok(p.title && p.description, `${p.slug} has a title and description`);
    // length only matters for pages that can appear in results; noindex articles are excluded
    if (!p.noindex) assert.ok(p.description.length >= 70 && p.description.length <= 165, `${p.slug} description is ${p.description.length} chars`);
    assert.ok(!titles.has(p.title), `duplicate title: ${p.title}`);
    assert.ok(!descs.has(p.description), `duplicate description: ${p.slug}`);
    titles.add(p.title);
    descs.add(p.description);
  }
});

test("marketing pages that use the shared header call-to-action keep a Sign In link for signed-out visitors", () => {
  const cta = read("components/NavAuthCta.tsx");
  // the signed-out branch (the one pre-rendered into the HTML) links to /login as well as /signup
  const signedOut = cta.slice(cta.lastIndexOf("return ("));
  assert.match(signedOut, /href="\/login"[\s\S]*Sign In/);
  assert.match(signedOut, /href="\/signup"/);
  // signed-in visitors still get the dashboard link
  assert.match(cta, /href="\/dashboard"[\s\S]*My Dashboard/);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
