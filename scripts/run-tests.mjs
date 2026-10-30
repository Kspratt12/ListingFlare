// Runs src/**/__tests__/*.test.ts with Node's built-in test runner.
// No new dependencies: files are compiled with the TypeScript compiler that is
// already a devDependency, into node_modules/.cache (ignored by git), and the
// "@/..." import alias is rewritten to the compiled files.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src");
const outDir = path.join(root, "node_modules", ".cache", "lf-tests");
fs.rmSync(outDir, { recursive: true, force: true });

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

function outPath(file) {
  return path.join(outDir, path.relative(srcDir, file)).replace(/\.tsx?$/, ".mjs");
}

const compiled = new Set();
function compile(file) {
  if (compiled.has(file)) return;
  compiled.add(file);
  const src = fs.readFileSync(file, "utf8");
  const out = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const rewritten = out.replace(/from\s+"([^"]+)"/g, (m, spec) => {
    // next/server has no package "exports" map, so plain Node ESM needs the explicit file.
    if (spec === "next/server") return 'from "next/server.js"';
    let resolved = null;
    if (spec.startsWith("@/")) resolved = path.join(srcDir, spec.slice(2));
    else if (spec.startsWith(".")) resolved = path.resolve(path.dirname(file), spec);
    if (!resolved) return m;
    const tsFile = [".ts", ".tsx"].map((e) => resolved + e).find((f) => fs.existsSync(f));
    if (!tsFile) return m;
    compile(tsFile);
    return `from "${pathToFileURL(outPath(tsFile)).href}"`;
  });
  fs.mkdirSync(path.dirname(outPath(file)), { recursive: true });
  fs.writeFileSync(outPath(file), rewritten);
}

const tests = walk(srcDir).filter((f) => /__tests__[\\/].+\.test\.ts$/.test(f));
if (tests.length === 0) {
  console.error("No tests found");
  process.exit(1);
}
tests.forEach(compile);

const res = spawnSync(process.execPath, ["--test", ...tests.map(outPath)], {
  stdio: "inherit",
  cwd: root,
  env: { ...process.env, LF_SRC_DIR: srcDir },
});
process.exit(res.status ?? 1);
