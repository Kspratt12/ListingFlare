import { setEnv } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  INTERNAL_HEADER,
  internalHeaders,
  isCronAuthorized,
  isInternalCall,
  secretsMatch,
} from "../internalAuth";

const req = (headers: Record<string, string>) => ({
  headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
});

const SECRET = "test-secret-not-a-real-one";

test("secretsMatch: equal strings match; anything missing, empty or different does not", () => {
  assert.equal(secretsMatch(SECRET, SECRET), true);
  assert.equal(secretsMatch(SECRET, SECRET + "x"), false);
  assert.equal(secretsMatch(SECRET + "x", SECRET), false);
  assert.equal(secretsMatch("", ""), false);
  assert.equal(secretsMatch(null, SECRET), false);
  assert.equal(secretsMatch(SECRET, null), false);
  assert.equal(secretsMatch(undefined, undefined), false);
  assert.equal(secretsMatch("a", "b"), false);
});

test("internal calls: no configured secret means DENY (this used to be open)", () => {
  setEnv("CRON_SECRET", undefined);
  assert.equal(isInternalCall(req({})), false);
  assert.equal(isInternalCall(req({ [INTERNAL_HEADER]: "anything" })), false);
  assert.equal(isInternalCall(req({ [INTERNAL_HEADER]: "" })), false);
  setEnv("CRON_SECRET", "");
  assert.equal(isInternalCall(req({})), false);
  assert.equal(isInternalCall(req({ [INTERNAL_HEADER]: "" })), false);
});

test("internal calls: a configured secret needs the exact header value", () => {
  setEnv("CRON_SECRET", SECRET);
  assert.equal(isInternalCall(req({ [INTERNAL_HEADER]: SECRET })), true);
  assert.equal(isInternalCall(req({ [INTERNAL_HEADER]: SECRET + "x" })), false);
  assert.equal(isInternalCall(req({ [INTERNAL_HEADER]: SECRET.slice(0, -1) })), false);
  assert.equal(isInternalCall(req({})), false);
  // the cron-style Authorization header is not accepted on the internal path
  assert.equal(isInternalCall(req({ authorization: `Bearer ${SECRET}` })), false);
  setEnv("CRON_SECRET", undefined);
});

test("internalHeaders sends nothing when there is no secret (so the receiving route denies)", () => {
  setEnv("CRON_SECRET", undefined);
  assert.deepEqual(internalHeaders(), {});
  setEnv("CRON_SECRET", SECRET);
  assert.deepEqual(internalHeaders(), { [INTERNAL_HEADER]: SECRET });
  setEnv("CRON_SECRET", undefined);
});

test("cron: no configured secret means DENY, even with a Bearer header and even in development", () => {
  setEnv("CRON_SECRET", undefined);
  setEnv("NODE_ENV", "development");
  assert.equal(isCronAuthorized(req({ authorization: "Bearer anything" })), false);
  assert.equal(isCronAuthorized(req({ authorization: "Bearer " })), false);
  assert.equal(isCronAuthorized(req({})), false);
  setEnv("CRON_SECRET", "");
  assert.equal(isCronAuthorized(req({ authorization: "Bearer " })), false);
  setEnv("NODE_ENV", "test");
});

test("cron: a configured secret needs 'Bearer <secret>' exactly; development grants nothing extra", () => {
  setEnv("CRON_SECRET", SECRET);
  assert.equal(isCronAuthorized(req({ authorization: `Bearer ${SECRET}` })), true);
  assert.equal(isCronAuthorized(req({ authorization: `Bearer ${SECRET}x` })), false);
  assert.equal(isCronAuthorized(req({ authorization: `bearer ${SECRET}` })), false);
  assert.equal(isCronAuthorized(req({ authorization: `Basic ${SECRET}` })), false);
  assert.equal(isCronAuthorized(req({ authorization: SECRET })), false);
  assert.equal(isCronAuthorized(req({})), false);
  // the internal-call header is not accepted on the cron path
  assert.equal(isCronAuthorized(req({ [INTERNAL_HEADER]: SECRET })), false);
  setEnv("NODE_ENV", "development");
  assert.equal(isCronAuthorized(req({ authorization: "Bearer wrong" })), false);
  setEnv("NODE_ENV", "test");
  setEnv("CRON_SECRET", undefined);
});

// ---- static checks across the route files ------------------------------------

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const srcDir = process.env.LF_SRC_DIR as string;
const apiFiles = () => walk(path.join(srcDir, "app", "api")).filter((f) => /route\.ts$/.test(f));
const rel = (f: string) => path.relative(srcDir, f).replace(/\\/g, "/");

test("static: no API route still treats NODE_ENV === 'development' as authorization", () => {
  const offenders = apiFiles()
    .filter((f) => /NODE_ENV\s*===?\s*["']development["']/.test(fs.readFileSync(f, "utf8")))
    .map(rel);
  assert.deepEqual(offenders, []);
});

test("static: the cron routes use the shared strict check", () => {
  const routes = [
    "app/api/follow-ups/process/route.ts",
    "app/api/showings/reminders/route.ts",
    "app/api/feedback/request/route.ts",
    "app/api/testimonials/request/route.ts",
    "app/api/cron/monthly-roi/route.ts",
    "app/api/trial/lifecycle/route.ts",
    "app/api/trial/re-engage/route.ts",
  ];
  for (const r of routes) {
    const text = fs.readFileSync(path.join(srcDir, r), "utf8");
    assert.match(text, /isCronAuthorized\(req\)/, r);
    assert.doesNotMatch(text, /authHeader === `Bearer/, r);
    assert.doesNotMatch(text, /auth === `Bearer/, r);
  }
});

test("static: the inbound-email webhook uses its own provider secret, not the cron secret", () => {
  const text = fs.readFileSync(path.join(srcDir, "app/api/messages/inbound/route.ts"), "utf8");
  assert.match(text, /RESEND_WEBHOOK_SECRET/);
  assert.match(text, /secretsMatch\(/);
  assert.doesNotMatch(text, /process\.env\.CRON_SECRET/);
  assert.doesNotMatch(text, /isCronAuthorized/);
});
