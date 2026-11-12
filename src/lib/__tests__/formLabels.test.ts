import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const srcDir = process.env.LF_SRC_DIR as string;
const read = (rel: string) => fs.readFileSync(path.join(srcDir, rel), "utf8");

for (const [name, rel] of [["create", "app/dashboard/create/page.tsx"], ["edit", "app/dashboard/edit/[id]/page.tsx"]] as const) {
  test(`${name} listing form: every <label> names a control through htmlFor, and every htmlFor has a matching id`, () => {
    const t = read(rel);
    // A label without htmlFor is only acceptable when it WRAPS its control (the photo dropzones, a checkbox).
    const unassociated: string[] = [];
    const re = /<label[^>]*>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) {
      if (/htmlFor=/.test(m[0])) continue;
      const end = t.indexOf("</label>", m.index);
      if (!/<input/.test(t.slice(m.index, end))) unassociated.push(m[0].slice(0, 80));
    }
    assert.deepEqual(unassociated, [], "labels that neither use htmlFor nor wrap an input");
    const fors = Array.from(t.matchAll(/htmlFor=(?:"([^"]+)"|\{`([^`]+)`\})/g)).map((m) => m[1] || m[2]);
    assert.ok(fors.length > 30, "the form has many labelled fields");
    for (const f of fors) {
      const idLiteral = /\$\{/.test(f) ? `id={\`${f}\`}` : `id="${f}"`;
      assert.ok(t.includes(idLiteral), `an id matching htmlFor ${f}`);
    }
  });
}

test("create form: the error banner is an announced alert and the required fields point at it when invalid", () => {
  const t = read("app/dashboard/create/page.tsx");
  assert.match(t, /id="create-form-error" role="alert"/);
  assert.match(t, /aria-describedby=\{error && \/\^city is required\/i\.test\(error\)/);
  assert.match(t, /getElementById\("create-street-address"\)\?\.focus\(\)/);
});

test("controls that previously had only a placeholder now carry an explicit name", () => {
  const t = read("app/dashboard/create/page.tsx");
  for (const label of ["Virtual tour URL", "Description", "Property highlights, one per line", "AI chat on this listing", "Listing URL or MLS description to auto-fill from"]) {
    assert.ok(t.includes(`aria-label="${label}"`), label);
  }
  assert.ok(read("components/BrandColorPicker.tsx").includes('aria-label="Brand color hex code"'));
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
