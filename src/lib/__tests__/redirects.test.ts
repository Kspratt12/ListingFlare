import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const srcDir = process.env.LF_SRC_DIR as string;
const root = path.resolve(srcDir, "..");

interface Rule { source: string; destination: string; permanent?: boolean; has?: unknown }
async function rules(): Promise<Rule[]> {
  const mod = await import(pathToFileURL(path.join(root, "next.config.mjs")).href);
  return await (mod.default.redirects() as Promise<Rule[]>);
}
function liveSlugs(): Set<string> {
  const dir = path.join(srcDir, "content", "articles");
  const out = new Set<string>();
  for (const f of fs.readdirSync(dir)) {
    const m = fs.readFileSync(path.join(dir, f), "utf8").match(/slug:\s*"([^"]+)"/);
    if (m) out.add(m[1]);
  }
  return out;
}
const blog = (r: Rule[]) => r.filter((x) => x.source.startsWith("/blog/"));

test("the two near-miss blog URLs redirect permanently to their exact live equivalents", async () => {
  const b = blog(await rules());
  const map = Object.fromEntries(b.map((r) => [r.source, r.destination]));
  assert.deepEqual(map, {
    "/blog/best-lead-generation-tools-real-estate-agents": "/blog/best-lead-generation-tools-for-real-estate-agents",
    "/blog/real-estate-leads-new-agents": "/blog/real-estate-leads-for-new-agents",
  });
  assert.ok(b.every((r) => r.permanent === true));
});

test("every blog redirect destination is a live article, never the homepage or another redirect (no chains, no loops)", async () => {
  const all = await rules();
  const slugs = liveSlugs();
  const sources = new Set(all.map((r) => r.source));
  for (const r of blog(all)) {
    const slug = r.destination.replace("/blog/", "");
    assert.ok(r.destination.startsWith("/blog/") && slugs.has(slug), `${r.destination} is a live article`);
    assert.ok(!sources.has(r.destination), `${r.destination} is not itself redirected (no chain)`);
    assert.notEqual(r.source, r.destination, "no self-redirect (no loop)");
    assert.ok(r.destination !== "/" && !/^https?:/.test(r.destination), "not the homepage or another host");
  }
});

test("a redirect source is never a live article URL (a real page must not be redirected away)", async () => {
  const slugs = liveSlugs();
  for (const r of blog(await rules())) assert.ok(!slugs.has(r.source.replace("/blog/", "")), r.source);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
