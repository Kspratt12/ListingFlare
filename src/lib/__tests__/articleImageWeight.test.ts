import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getAllPosts } from "../blog";

const SRC = process.env.LF_SRC_DIR as string;
const BLOG_IMAGES = path.join(SRC, "..", "public", "blog");
const LIMIT = 1000 * 1024; // no single article image above ~1 MB

function listImages(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listImages(p));
    else if (/\.(png|jpe?g|webp)$/i.test(e.name)) out.push(p);
  }
  return out;
}

test("no article image is larger than about 1 MB (keeps pages light on mobile)", () => {
  const files = listImages(BLOG_IMAGES);
  assert.ok(files.length > 150, "image inventory is present");
  const big = files.filter((f) => fs.statSync(f).size > LIMIT).map((f) => path.relative(BLOG_IMAGES, f));
  assert.deepEqual(big, []);
});

test("every image an article body embeds from /blog/ still exists", () => {
  const missing: string[] = [];
  for (const p of getAllPosts()) {
    const re = /<img[^>]*src="(\/blog\/[^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(p.content))) {
      if (!fs.existsSync(path.join(SRC, "..", "public", m[1]))) missing.push(p.slug + " -> " + m[1]);
    }
  }
  assert.deepEqual(missing, []);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
