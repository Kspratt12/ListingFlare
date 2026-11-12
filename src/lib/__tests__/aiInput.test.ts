import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  AI_INPUT_LIMITS as L, checkAssistant, checkCaption, checkGenerate, checkSocialCaption, codePoints, readLimitedJson, readAiInput,
} from "../aiInput";

const srcDir = process.env.LF_SRC_DIR as string;
const req = (body: string, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/ai/x", { method: "POST", body, headers: { "Content-Type": "application/json", ...headers } });
const prop = { street: "1847 Grandview Terrace", city: "Pacific Palisades", state: "CA", zip: "90272", price: "4750000", beds: 5, baths: 4.5, sqft: "4,820", yearBuilt: 2019, lotSize: "0.38 acres" };

// ---- normal input is accepted
test("normal input is accepted by every validator", () => {
  assert.equal(checkGenerate({ type: "description", property: prop, existing: "A bright home with a view. ".repeat(40) }), null);
  assert.equal(checkGenerate({ type: "features", property: prop }), null);
  assert.equal(checkCaption({ photoUrls: ["https://x.supabase.co/storage/v1/object/public/listing-photos/a.jpg"], property: { street: "1 Main", city: "Testville", beds: 3, baths: 2, sqft: 1800 } }), null);
  assert.equal(checkAssistant({ message: "Which of my listings needs attention?", history: [{ role: "user", text: "hi" }, { role: "assistant", text: "Hello" }] }), null);
  assert.equal(checkSocialCaption({ street: "1 Main", city: "Testville", state: "ZZ", price: "$450,000", beds: 3, baths: 2, sqft: 1800, features: ["Garage", "Fenced yard"], description: "Nice home", publicUrl: "https://www.listingflare.com/listing/x", agentName: "Alex Agent" }), null);
});

test("limits sit above realistic maximums: a 4,000-character MLS description, 40 features and 25 photos pass", () => {
  assert.equal(checkGenerate({ type: "description", property: prop, existing: "x".repeat(4000) }), null);
  assert.equal(checkSocialCaption({ street: "s", city: "c", features: Array.from({ length: 40 }, () => "y".repeat(100)), description: "d".repeat(4000) }), null);
  assert.equal(checkCaption({ photoUrls: Array.from({ length: 25 }, (_, i) => `https://h/p${i}.jpg`) }), null);
});

// ---- oversized fields are rejected with a clear message (never truncated)
test("generate: an oversized starting text is rejected with the counts and the limit", () => {
  const e = checkGenerate({ type: "description", property: prop, existing: "x".repeat(L.existingText + 1) })!;
  assert.equal(e.status, 422); assert.equal(e.code, "input_too_long"); assert.equal(e.field, "existing"); assert.equal(e.max, L.existingText);
  assert.match(e.error, /6,001 of 6,000 characters/); assert.match(e.error, /Shorten it/);
});
test("generate: each short field is bounded", () => {
  for (const f of ["street", "city", "state", "zip", "lotSize"]) {
    const e = checkGenerate({ type: "description", property: { ...prop, [f]: "z".repeat(L.shortText + 1) } })!;
    assert.equal(e.field, f, f); assert.equal(e.max, L.shortText);
  }
  assert.equal(checkGenerate({ type: "description", property: { ...prop, price: "9".repeat(L.numberField + 1) } })!.field, "price");
});
test("caption: too many photos, a non-https link and an over-long link are rejected", () => {
  const many = checkCaption({ photoUrls: Array.from({ length: L.photoUrls + 1 }, () => "https://h/p.jpg") })!;
  assert.equal(many.status, 422); assert.match(many.error, /26 of 25/);
  assert.match(checkCaption({ photoUrls: ["http://h/p.jpg"] })!.error, /https/);
  assert.match(checkCaption({ photoUrls: ["javascript:alert(1)"] })!.error, /https/);
  assert.equal(checkCaption({ photoUrls: ["https://h/" + "a".repeat(L.url)] })!.max, L.url);
});
test("assistant: an oversized question or earlier message is rejected; empty is rejected", () => {
  assert.equal(checkAssistant({ message: "q".repeat(L.chatMessage + 1) })!.field, "message");
  assert.equal(checkAssistant({ message: "ok", history: [{ role: "user", text: "h".repeat(L.historyMessageChars + 1) }] })!.field, "history");
  assert.equal(checkAssistant({ message: "   " })!.status, 400);
  assert.equal(checkAssistant({})!.status, 400);
});
test("social caption: too many or over-long features, and an over-long description, are rejected", () => {
  assert.equal(checkSocialCaption({ street: "s", city: "c", features: Array.from({ length: L.featureItems + 1 }, () => "f") })!.field, "features");
  assert.equal(checkSocialCaption({ street: "s", city: "c", features: ["f".repeat(L.featureItemChars + 1)] })!.field, "features");
  assert.equal(checkSocialCaption({ street: "s", city: "c", description: "d".repeat(L.description + 1) })!.field, "description");
});
test("wrong types are rejected rather than coerced", () => {
  assert.equal(checkGenerate({ type: "description", property: { ...prop, street: { a: 1 } } })!.status, 400);
  assert.equal(checkGenerate({ type: 5, property: prop })!.status, 400);
  assert.equal(checkGenerate({ type: "description" })!.status, 400);
  assert.equal(checkGenerate("nope")!.status, 400);
  assert.equal(checkSocialCaption({ street: "s", city: "c", features: "a,b" })!.status, 400);
  assert.equal(checkAssistant({ message: "ok", history: "x" })!.status, 400);
});

// ---- oversized requests
test("a declared oversized body is refused (413) before it is read; an undeclared oversized body is refused after reading", async () => {
  const big = JSON.stringify({ a: "x".repeat(L.requestBytes) });
  const declared = await readLimitedJson(req("{}", { "content-length": String(L.requestBytes + 1) }));
  assert.equal(declared.ok, false); if (!declared.ok) assert.equal(declared.status, 413);
  const actual = await readLimitedJson(req(big));
  assert.equal(actual.ok, false); if (!actual.ok) { assert.equal(actual.status, 413); assert.equal(actual.code, "request_too_large"); assert.match(actual.error, /64 KB/); }
});
test("invalid JSON is a 400, a valid body parses", async () => {
  const bad = await readLimitedJson(req("{not json")); assert.equal(bad.ok, false); if (!bad.ok) assert.equal(bad.status, 400);
  const good = await readLimitedJson(req('{"x":1}')); assert.deepEqual(good.ok && good.value, { x: 1 });
});

// ---- Unicode
test("Unicode: characters are counted as code points, not UTF-16 units (an emoji is 1, so valid text is not wrongly rejected)", () => {
  assert.equal(codePoints("😀"), 1); assert.equal("😀".length, 2);
  assert.equal(checkGenerate({ type: "description", property: prop, existing: "😀".repeat(L.existingText) }), null);
  assert.equal(checkGenerate({ type: "description", property: prop, existing: "😀".repeat(L.existingText + 1) })!.field, "existing");
  assert.equal(checkGenerate({ type: "description", property: { ...prop, city: "北京市朝阳区".repeat(20) } }), null); // 120 CJK characters
  assert.equal(checkGenerate({ type: "description", property: { ...prop, city: "é".repeat(L.shortText) } }), null);
  assert.equal(checkGenerate({ type: "description", property: { ...prop, city: "مدينة".repeat(24) } }), null); // right-to-left, 120 chars
});
test("Unicode: multi-byte text cannot slip past the whole-request byte limit even when the character count is small", async () => {
  const text = "😀".repeat(20_000); // 20,000 characters, 80,000 bytes
  assert.equal(checkGenerate({ type: "description", property: prop, existing: text.slice(0, 0) }), null);
  const r = await readLimitedJson(req(JSON.stringify({ existing: text })));
  assert.equal(r.ok, false); if (!r.ok) assert.equal(r.status, 413);
});
test("Unicode text within the limits is accepted end to end through readAiInput", async () => {
  const r = await readAiInput(req(JSON.stringify({ type: "description", property: prop, existing: "Maison près de la mer 🌊 日本語のテキスト" })), checkGenerate);
  assert.equal(r.ok, true);
});

// ---- the model is never reached for invalid requests, and the existing protections stay
const route = (name: string) => fs.readFileSync(path.join(srcDir, "app/api/ai", name, "route.ts"), "utf8");
for (const name of ["generate", "caption", "assistant", "social-caption"]) {
  test(`static: ${name} validates before the model is created or called, and after authentication, entitlement and the rate limit`, () => {
    const t = route(name);
    const v = t.indexOf("readAiInput(");
    assert.ok(v > 0, "uses readAiInput");
    for (const later of ["createAnthropic(", "messages.create("]) {
      const at = t.indexOf(later);
      if (at >= 0) assert.ok(v < at, `${later} comes after validation`);
    }
    for (const before of ["getUser()", "hasEntitlement(", "hasActiveSubscription(", "rateLimit({"]) {
      const at = t.indexOf(before);
      if (at >= 0) assert.ok(at < v, `${before} comes before validation`);
    }
    assert.match(t, /inputErrorResponse\(/);
  });
}
test("static: the existing output caps and subscription checks are unchanged", () => {
  assert.match(route("generate"), /max_tokens: 1024/);
  assert.match(route("generate"), /hasActiveSubscription/);
  assert.match(route("assistant"), /max_tokens: 1024/);
  assert.match(route("caption"), /max_tokens: 1024/);
  assert.match(route("social-caption"), /max_tokens: 700/);
  assert.match(route("social-caption"), /hasEntitlement\(user\.id, "socialPosts"\)/);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});

test("static: the create and edit forms check the same limit before calling generate, show a character hint, and keep caption batches within the per-request photo limit", () => {
  for (const rel of ["app/dashboard/create/page.tsx", "app/dashboard/edit/[id]/page.tsx"]) {
    const t = fs.readFileSync(path.join(srcDir, rel), "utf8");
    assert.match(t, /AI_INPUT_LIMITS\.existingText/);
    assert.match(t, /description-hint/);
    assert.match(t, /slice\(0, AI_INPUT_LIMITS\.photoUrls\)/);
    assert.match(t, /typeof info\.error === "string"/);
  }
  const a = fs.readFileSync(path.join(srcDir, "app/dashboard/assistant/page.tsx"), "utf8");
  assert.match(a, /maxLength=\{AI_INPUT_LIMITS\.chatMessage\}/);
});
