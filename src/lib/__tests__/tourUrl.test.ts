import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { safeTourEmbedUrl, tourUrlProblem, validateTourUrl, TOUR_PROVIDER_RULES, UNVERIFIED_TOUR_FORMATS } from "../tourUrl";

// Validator tests are on the pure functions. "Save" and "render" wiring is checked by SOURCE guard tests here;
// the real components are rendered in componentRender.test.ts (server-side markup, not a browser).
// Host and path rules under test: Matterport (UNVERIFIED format, domain-wide), Kuula, CloudPano and iGUIDE
// (documented hosts and paths). Passing the validator is not proof that a destination is safe or will embed.

const srcDir = process.env.LF_SRC_DIR as string;
const read = (rel: string) => fs.readFileSync(path.join(srcDir, rel), "utf8").replace(/\r/g, "");

const okUrl = (v: unknown) => {
  const r = validateTourUrl(v);
  assert.ok(r.ok, `expected ok for ${JSON.stringify(v)}${r.ok ? "" : " (" + r.code + ")"}`);
  return r.ok ? r.url : null;
};
const codeOf = (v: unknown) => {
  const r = validateTourUrl(v);
  assert.ok(!r.ok, `expected rejection for ${JSON.stringify(v)}`);
  return r.ok ? "" : r.code;
};

// ---------- provider rules ----------

test("rule table: four providers, only Matterport flagged unverified, every documented rule has a path prefix", () => {
  assert.deepEqual(TOUR_PROVIDER_RULES.map((r) => r.provider), ["Matterport", "Kuula", "CloudPano", "iGUIDE"]);
  assert.deepEqual(TOUR_PROVIDER_RULES.filter((r) => r.basis === "unverified").map((r) => r.provider), ["Matterport"]);
  for (const r of TOUR_PROVIDER_RULES.filter((x) => x.basis === "documented")) {
    assert.ok(r.pathPrefixes && r.pathPrefixes.length > 0, `${r.provider} has a documented path prefix`);
    assert.ok(r.hosts.every((h) => !h.subdomains), `${r.provider} accepts exact hosts only`);
  }
  for (const r of TOUR_PROVIDER_RULES) {
    for (const h of r.hosts) assert.match(h.name, /^[a-z0-9.-]+$/, "lowercase ascii host names, no wildcards or schemes");
    for (const p of r.pathPrefixes ?? []) assert.ok(p.startsWith("/") && p.endsWith("/"), p);
  }
  assert.ok(UNVERIFIED_TOUR_FORMATS.length >= 4, "the list of unverified formats is kept visible");
});

test("valid documented embed links pass and come back normalised", () => {
  assert.equal(okUrl("https://my.matterport.com/show/?m=abc123"), "https://my.matterport.com/show/?m=abc123");
  assert.equal(okUrl("https://my.matterport.com/show?play=1&lang=en-US&m=d7Kai9ZKt4D&hl=0&ts=0&brand=0"),
    "https://my.matterport.com/show?play=1&lang=en-US&m=d7Kai9ZKt4D&hl=0&ts=0&brand=0", "the demo page's own tour link");
  assert.ok(okUrl("https://matterport.com/discover/space/xyz"), "Matterport stays domain-wide (unverified format)");
  assert.ok(okUrl("https://kuula.co/share/collection/7abc?fs=1"));
  assert.ok(okUrl("https://kuula.co/share/7abc/collection/7def?logo=1"));
  assert.ok(okUrl("https://www.kuula.co/share/xyz"));
  assert.ok(okUrl("https://mls.kuu.la/share/XXXXX"));
  assert.ok(okUrl("https://app.cloudpano.com/tours/abc"));
  assert.ok(okUrl("https://youriguide.com/embed/api-docs-sample/"));
  assert.ok(okUrl("https://unbranded.youriguide.com/embed/api-docs-sample/"));
});

test("provider pages that are not documented embed formats are rejected with the path code", () => {
  for (const v of [
    "https://kuula.co/", "https://kuula.co/share", "https://kuula.co/share/", "https://kuula.co/explore/x", "https://www.kuula.co/", "https://mls.kuu.la/",
    "https://app.cloudpano.com/", "https://app.cloudpano.com/tours/", "https://app.cloudpano.com/login", "https://app.cloudpano.com/tour/abc",
    "https://youriguide.com/", "https://youriguide.com/embed/", "https://youriguide.com/pricing", "https://unbranded.youriguide.com/view/x",
  ]) {
    assert.equal(codeOf(v), "path", v);
    assert.equal(safeTourEmbedUrl(v), null, v);
  }
});

test("Kuula /post/ links are rejected with guidance to use the share link", () => {
  for (const v of ["https://kuula.co/post/abc", "https://www.kuula.co/post/abc/collection/xyz", "https://kuula.co/post/", "https://mls.kuu.la/post/x"]) {
    assert.equal(codeOf(v), "kuula_post", v);
    assert.equal(safeTourEmbedUrl(v), null, v);
  }
  const msg = tourUrlProblem("https://kuula.co/post/abc") ?? "";
  assert.match(msg, /can't be embedded/);
  assert.match(msg, /https:\/\/kuula\.co\/share\//);
});

test("hosts and subdomains outside the documented list are rejected (not accepted just because the provider is named)", () => {
  for (const v of [
    "https://cloudpano.com/tours/abc", "https://tours.cloudpano.com/tours/abc", "https://other.kuula.co/share/x", "https://kuu.la/share/x", "https://evil.kuu.la/share/x",
    "https://iguidephotos.com/embed/x/", "https://iguideradix.com/embed/x/", "https://my.youriguide.com/embed/x/", "https://notyouriguide.com/embed/x/",
    "https://youriguide.com.evil.example/embed/x/",
  ]) {
    assert.equal(codeOf(v), "host", v);
  }
});

test("path matching is on the parsed path: dot segments and encoded dots cannot reach a different path", () => {
  assert.equal(codeOf("https://kuula.co/share/../post/abc"), "kuula_post");
  assert.equal(codeOf("https://kuula.co/share/%2e%2e/post/abc"), "kuula_post");
  assert.equal(codeOf("https://app.cloudpano.com/tours/../login"), "path");
  assert.equal(codeOf("https://youriguide.com/embed/../pricing"), "path");
  assert.equal(codeOf("https://kuula.co/SHARE/x"), "path", "paths are case-sensitive");
});

test("surrounding whitespace is trimmed, host case is normalised, the default port 443 is accepted", () => {
  assert.equal(okUrl("  https://my.matterport.com/show/?m=1  "), "https://my.matterport.com/show/?m=1");
  assert.equal(okUrl("HTTPS://My.Matterport.COM/show/?m=1"), "https://my.matterport.com/show/?m=1");
  assert.equal(okUrl("https://my.matterport.com:443/show/?m=1"), "https://my.matterport.com/show/?m=1");
  assert.equal(okUrl("https://KUULA.co/share/x"), "https://kuula.co/share/x");
});

test("empty, null and undefined mean 'no tour' and are valid", () => {
  for (const v of ["", "   ", null, undefined]) assert.equal(okUrl(v), null);
  assert.equal(tourUrlProblem(""), null);
  assert.equal(safeTourEmbedUrl(""), null);
});

test("javascript: and data: and other non-https schemes are rejected, in any casing", () => {
  for (const v of [
    "javascript:alert(1)", "JaVaScRiPt:alert(document.cookie)", "  javascript:alert(1)", "javascript://my.matterport.com/%0aalert(1)",
    "data:text/html,<script>alert(1)</script>", "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==", "vbscript:msgbox(1)",
    "blob:https://my.matterport.com/abc", "file:///etc/passwd", "ftp://kuula.co/x", "http://my.matterport.com/show/?m=1", "about:blank",
  ]) {
    assert.ok(["scheme", "forbidden_characters", "malformed"].includes(codeOf(v)), v);
    assert.equal(safeTourEmbedUrl(v), null, `${v} must not render`);
  }
  assert.equal(codeOf("javascript:alert(1)"), "scheme");
  assert.equal(codeOf("http://my.matterport.com/show/?m=1"), "scheme");
});

test("protocol-relative, relative and scheme-less input is rejected", () => {
  for (const v of ["//my.matterport.com/show/?m=1", "///my.matterport.com", "/show/?m=1", "show/?m=1", "my.matterport.com/show/?m=1", "www.kuula.co/share/x", "?m=1", "#frag"]) {
    assert.ok(["malformed", "scheme"].includes(codeOf(v)), v);
  }
});

test("malformed input is rejected without throwing", () => {
  for (const v of ["https://", "https:///", "https://:443", "https://[::1", "https://exa mple.com", "ht!tp://x", "https://%zz.matterport.com"]) {
    assert.doesNotThrow(() => validateTourUrl(v));
    assert.equal(validateTourUrl(v).ok, false, v);
  }
});

test("deceptive suffix, prefix and look-alike hosts are rejected", () => {
  for (const v of [
    "https://evilmatterport.com/x", "https://my-matterport.com/x", "https://matterport.com.evil.example/x", "https://my.matterport.com.evil.example/",
    "https://kuula.co.evil.example/share/x", "https://notkuula.co/share/x", "https://cloudpano.com.attacker.net/tours/x", "https://xcloudpano.com/tours/x",
    "https://evil.example/my.matterport.com", "https://evil.example/?u=https://my.matterport.com/", "https://evil.example/#matterport.com",
    "https://matterport.co/", "https://matterport.com-evil.example/", "https://127.0.0.1/", "https://[::1]/", "https://localhost/",
    "https://mаtterport.com/", // Cyrillic small a (U+0430) in place of the Latin a
  ]) {
    assert.equal(codeOf(v), "host", v);
    assert.equal(safeTourEmbedUrl(v), null, v);
  }
});

test("trailing-dot, leading-dot and empty-label hosts are rejected, as is an invalid punycode label", () => {
  assert.equal(codeOf("https://my.matterport.com./x"), "host");
  assert.equal(codeOf("https://.matterport.com/x"), "host");
  assert.equal(codeOf("https://my..matterport.com/x"), "host");
  assert.ok(["host", "malformed"].includes(codeOf("https://xn--mtterport-bwa.com/")));
  assert.equal(safeTourEmbedUrl("https://.matterport.com/x"), null);
});

test("credential-bearing and port-bearing URLs are rejected", () => {
  assert.equal(codeOf("https://user:pass@my.matterport.com/show/?m=1"), "credentials");
  assert.equal(codeOf("https://user@my.matterport.com/"), "credentials");
  assert.equal(codeOf("https://my.matterport.com@evil.example/"), "credentials");
  assert.equal(codeOf("https://my.matterport.com%2f@evil.example/"), "credentials");
  assert.equal(codeOf("https://my.matterport.com:8443/show/?m=1"), "port");
  assert.equal(codeOf("https://my.matterport.com:80/"), "port");
  assert.equal(codeOf("https://user:pass@kuula.co/share/x"), "credentials");
});

test("whitespace, control characters and backslashes inside the value are rejected before parsing", () => {
  for (const v of ["https://my.matterport.com/ show", "https://my.matterport.com/\tshow", "java\nscript:alert(1)", "https://my.matterport.com/\u0000", "https://my.matterport.com\\@evil.example/", "https://my.matterport.com\\evil", "https://my.matterport.com/\u0085x"]) {
    assert.equal(codeOf(v), "forbidden_characters", JSON.stringify(v));
  }
});

test("over-long and non-string input is rejected", () => {
  assert.equal(codeOf("https://my.matterport.com/?" + "a".repeat(2100)), "too_long");
  for (const v of [123, {}, ["https://my.matterport.com/"], true, () => "x"]) assert.equal(codeOf(v), "type");
});

test("a full-width look-alike that the URL parser folds to a supported host is normalised to ASCII", () => {
  // U+FF4D (full-width m). The parser's own IDNA mapping turns this into my.matterport.com; what is rendered is the ASCII result.
  const out = okUrl("https://my.ｍatterport.com/show/?m=1");
  assert.equal(out, "https://my.matterport.com/show/?m=1");
});

// ---------- render: stored values (existing data) ----------

test("render: safeTourEmbedUrl returns null for unsupported stored values, never throws, and never changes its input", () => {
  const stored = ["javascript:alert(1)", "//evil.example", "http://my.matterport.com/", "https://evil.example/", "https://kuula.co/post/abc", "https://cloudpano.com/", "", null, undefined, 5, {}, "https://" + "a".repeat(3000) + ".com"];
  for (const v of stored) {
    const before = typeof v === "object" ? JSON.stringify(v) : v;
    assert.equal(safeTourEmbedUrl(v), null);
    assert.equal(typeof v === "object" ? JSON.stringify(v) : v, before, "input untouched");
  }
  assert.equal(safeTourEmbedUrl("https://my.matterport.com/show/?m=1"), "https://my.matterport.com/show/?m=1", "valid legacy values still render");
});

test("form messages: a rejected value gives guidance naming the supported providers and does not promise it will load", () => {
  const msg = tourUrlProblem("javascript:alert(1)") ?? "";
  for (const name of ["Matterport", "Kuula", "CloudPano", "iGUIDE"]) assert.ok(msg.includes(name), name);
  assert.match(msg, /https:\/\//);
  assert.match(msg, /can still fail to load/);
  assert.ok(!/\b(safe|guarantee|verified)\b/i.test(msg), "the message does not claim host validation proves safety");
  assert.equal(tourUrlProblem("https://my.matterport.com/show/?m=1"), null);
  assert.match(tourUrlProblem("https://app.cloudpano.com/login") ?? "", /embed format that provider documents/);
});

// ---------- source guards: wiring on save and on render ----------

test("source: the public page and the embed component only ever use the validated address", () => {
  const page = read("app/listing/[id]/ListingPageClient.tsx");
  assert.match(page, /const tourSrc = safeTourEmbedUrl\(listing\.virtual_tour_url\)/);
  assert.match(page, /\{tourSrc && <VirtualTourEmbed src=\{tourSrc\} \/>\}/);
  assert.ok(!/<VirtualTourEmbed src=\{listing\.virtual_tour_url\}/.test(page), "raw stored value is not passed through");
  const embed = read("components/VirtualTourEmbed.tsx");
  assert.match(embed, /const safeSrc = safeTourEmbedUrl\(src\)/);
  assert.match(embed, /if \(!safeSrc\) return null/);
  assert.match(embed, /<iframe[\s\S]*?src=\{safeSrc\}/);
  assert.ok(!/src=\{src\}/.test(embed), "the iframe never receives the unvalidated prop");
});

test("source: create and edit validate on save before writing, and the edit preview only frames a validated address", () => {
  const create = read("app/dashboard/create/page.tsx");
  const handleSaveC = create.slice(create.indexOf("const handleSave = async"));
  assert.ok(handleSaveC.indexOf("tourUrlProblem(virtualTourUrl)") > -1 && handleSaveC.indexOf("tourUrlProblem(virtualTourUrl)") < handleSaveC.indexOf('.from("listings").insert('), "create: checked before the insert");
  const edit = read("app/dashboard/edit/[id]/page.tsx");
  const handleSaveE = edit.slice(edit.indexOf("const handleSave = async"));
  const iCheck = handleSaveE.indexOf("tourUrlProblem(virtualTourUrl)");
  assert.ok(iCheck > -1 && iCheck < handleSaveE.indexOf("virtual_tour_url: virtualTourUrl"), "edit: checked before the update");
  assert.match(handleSaveE, /virtualTourUrl\.trim\(\) !== loadedTourUrl\.trim\(\)/, "an unchanged legacy value does not block unrelated edits");
  assert.ok(!/src=\{virtualTourUrl\}/.test(edit), "preview never frames the raw field value");
  assert.match(edit, /src=\{safeTourEmbedUrl\(virtualTourUrl\) \?\? undefined\}/);
  assert.match(edit, /The tour is not shown on your listing until the link is replaced or cleared/, "owner is told what happens to an unsupported stored link");
  for (const [name, src] of [["create", create], ["edit", edit]] as const) {
    assert.ok(!/or any 360° tour provider/.test(src), `${name}: no longer promises "any" provider`);
  }
});

test("source: editing a listing with an unchanged unsupported link still saves the other fields and leaves the stored link as loaded", () => {
  const edit = read("app/dashboard/edit/[id]/page.tsx");
  // the stored value is loaded into both the field and the 'as loaded' copy, and saved back exactly as typed
  assert.match(edit, /setVirtualTourUrl\(data\.virtual_tour_url \|\| ""\)/);
  assert.match(edit, /setLoadedTourUrl\(data\.virtual_tour_url \|\| ""\)/);
  assert.match(edit, /virtual_tour_url: virtualTourUrl\b/, "saved as the field holds it: no rewriting");
  assert.ok(!/virtual_tour_url: (safeTourEmbedUrl|validateTourUrl)\(/.test(edit), "the save does not substitute a normalised value");
  // the decision rule used by the page, reproduced: a problem blocks only when the value changed
  const blocks = (loaded: string, field: string) => field.trim() !== loaded.trim() && tourUrlProblem(field) !== null;
  assert.equal(blocks("https://kuula.co/post/abc", "https://kuula.co/post/abc"), false, "unchanged unsupported value does not block");
  assert.equal(blocks("https://kuula.co/post/abc", "  https://kuula.co/post/abc  "), false, "whitespace-only difference does not block");
  assert.equal(blocks("https://kuula.co/post/abc", "https://kuula.co/post/other"), true, "a changed unsupported value blocks");
  assert.equal(blocks("https://kuula.co/post/abc", ""), false, "clearing it is allowed");
  assert.equal(blocks("https://kuula.co/post/abc", "https://kuula.co/share/abc"), false, "replacing it with a documented link is allowed");
  assert.equal(safeTourEmbedUrl("https://kuula.co/post/abc"), null, "and the unsupported value never reaches a frame");
});

test("source: duplicating a listing copies the stored link unchanged, and the copy only renders it through the validated path", () => {
  const dash = read("app/dashboard/page.tsx");
  const dup = dash.slice(dash.indexOf("const handleDuplicate = async"));
  const insertAt = dup.indexOf('.from("listings").insert(');
  assert.ok(insertAt > -1);
  const insertBlock = dup.slice(insertAt, dup.indexOf(".single()", insertAt));
  assert.match(insertBlock, /status: "draft"/, "the copy starts as a draft");
  assert.match(insertBlock, /virtual_tour_url: listing\.virtual_tour_url,/, "the stored link is copied exactly");
  assert.ok(!/virtual_tour_url: (safeTourEmbedUrl|validateTourUrl)\(/.test(insertBlock), "duplicate does not rewrite the link");
  // consequences, using the same validator the public page and editor use
  for (const stored of ["https://kuula.co/post/abc", "javascript:alert(1)", "https://evil.example/x"]) {
    assert.equal(safeTourEmbedUrl(stored), null, `a copied unsupported link (${stored}) never reaches a frame`);
    assert.ok(tourUrlProblem(stored), "and the owner is told in the editor of the copy");
  }
  assert.equal(safeTourEmbedUrl("https://my.matterport.com/show/?m=1"), "https://my.matterport.com/show/?m=1", "a supported link copies and still renders");
  // the copy is shown on the public page only through ListingPageClient, which is guarded above
  assert.ok(!/<iframe/.test(dash), "the dashboard never frames the link itself");
});

test("source: no other component renders virtual_tour_url", () => {
  const files: string[] = [];
  const walk = (d: string) =>
    fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else files.push(p);
    });
  walk(srcDir);
  const users = files
    .filter((f) => /\.tsx?$/.test(f) && !/__tests__/.test(f))
    .filter((f) => /virtual_tour_url|virtualTourUrl/.test(fs.readFileSync(f, "utf8")))
    .map((f) => path.relative(srcDir, f).split(path.sep).join("/"))
    .sort();
  assert.deepEqual(users, [
    "app/api/demo/seed/route.ts",            // writes an empty string
    "app/dashboard/create/page.tsx",         // form, validated on save
    "app/dashboard/edit/[id]/page.tsx",      // form, validated on save and before preview
    "app/dashboard/page.tsx",                // copies a listing; the copy is rendered only through the validated path
    "app/listing/[id]/ListingPageClient.tsx",// public page, validated at render
    "app/listing/[id]/page.tsx",             // only names the column in the select list
    "lib/types.ts",
  ].sort());
});

test("no test above reached the network", () => {
  assertNoNetworkAttempts();
});
