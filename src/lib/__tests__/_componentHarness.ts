import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

// Shared setup for the ACTUAL-COMPONENT tests (componentRender.test.ts and any test that renders the real
// components). It renders the REAL components to server-side HTML with react-dom/server and FICTIONAL data.
//
// Evidence class: server-rendered markup of the real components. It is NOT a browser: nothing here hydrates,
// runs effects, parses the HTML as a page, or loads a frame.
//
// HARNESS SUBSTITUTIONS made here (everything else is the real code and the real installed react, react-dom, next):
//  H1  The runner only transpiles plain .ts, so the component sources are compiled with the installed TypeScript
//      (transpile only, CommonJS, automatic JSX) into node_modules/.cache/lf-component-render-<name>, which is
//      git-ignored and recreated on every run. No type-check happens at this step.
//  H2  Imports of .css/.svg/.png/.jpg resolve to an empty object.
// Substitutions made by an individual test are listed in that test's header (the city page fakes its data source).
// The network block and secret scrubbing come from _isolation.ts, which each test imports.

export type Component = (props: Record<string, unknown>) => React.ReactElement | null;

export function createHarness(name: string) {
  const srcDir = process.env.LF_SRC_DIR as string;
  const root = path.resolve(srcDir, "..");
  const outDir = path.join(root, "node_modules", ".cache", `lf-component-render-${name}`);
  const nodeRequire = createRequire(path.join(root, "package.json"));
  const React = nodeRequire("react") as typeof import("react");
  const { renderToStaticMarkup } = nodeRequire("react-dom/server") as typeof import("react-dom/server");

  fs.rmSync(outDir, { recursive: true, force: true });
  const compiled = new Map<string, string>();

  function resolveSource(spec: string, fromFile: string): string | null {
    const base = spec.startsWith("@/") ? path.join(srcDir, spec.slice(2)) : path.resolve(path.dirname(fromFile), spec);
    for (const c of [base + ".ts", base + ".tsx", path.join(base, "index.ts"), path.join(base, "index.tsx"), base]) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
    }
    return null;
  }

  function compile(file: string): string {
    file = path.resolve(file);
    const known = compiled.get(file);
    if (known) return known;
    const out = path.join(outDir, path.relative(srcDir, file)).replace(/\.tsx?$/, ".cjs");
    compiled.set(file, out);
    let js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      fileName: file,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    js = js.replace(/require\("([^"]+)"\)/g, (m, spec: string) => {
      if (!(spec.startsWith("@/") || spec.startsWith("."))) return m;
      if (/\.(css|svg|png|jpg)$/.test(spec)) return "({})"; // H2 (also when the file exists, e.g. the root layout's globals.css)
      const target = resolveSource(spec, file);
      if (!target) return m;
      return `require(${JSON.stringify(compile(target))})`;
    });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, js);
    return out;
  }

  const load = (rel: string) => nodeRequire(compile(path.join(srcDir, rel))).default;
  const h = (c: Component, props: Record<string, unknown>) => renderToStaticMarkup(React.createElement(c as React.FunctionComponent, props));
  const iframeSrcs = (html: string) => Array.from(html.matchAll(/<iframe[^>]*\ssrc="([^"]*)"/g)).map((m) => m[1].replace(/&amp;/g, "&"));
  const ldBlocks = (html: string) => Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)).map((m) => m[1]);

  // Fictional listing and agent used to render the real public listing page.
  const base = {
    id: "00000000-0000-4000-8000-000000000001", agent_id: "00000000-0000-4000-8000-0000000000a1", status: "published", slug: "fictional-home",
    street: "1 Fictional Way", city: "Exampleville", state: "NC", zip: "27000", price: 450000, beds: 3, baths: 2, sqft: 1800,
    description: "A fictional description.", features: ["Porch"], photos: [{ src: "https://images.unsplash.com/photo-test", alt: "front" }], videos: [],
    virtual_tour_url: "", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
  };
  const agent = {
    id: base.agent_id, handle: "fictional", name: "Fiction Agent", title: "Agent", brokerage: "Example Realty", phone: "5555550100", email: "agent@example.invalid",
    headshot_url: "", brand_color: "#b8860b", instagram: "", linkedin: "", zillow: "", realtor_com: "", facebook: "", website: "", calendly_url: "",
    license_number: "X1", subscription_status: "active", trial_ends_at: "2030-01-01T00:00:00Z",
  };
  const ListingPageClient = load("app/listing/[id]/ListingPageClient.tsx") as Component;
  const listingPage = (over: Record<string, unknown>) => h(ListingPageClient, { listing: { ...base, ...over }, agent, isOwner: false });

  return { srcDir, nodeRequire, React, renderToStaticMarkup, compile, load, h, iframeSrcs, ldBlocks, listingPage };
}
