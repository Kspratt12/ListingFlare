import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = process.env.LF_SRC_DIR as string;
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8").replace(/\r\n/g, "\n");

test("the billing page shows a complimentary owner account honestly and offers no Stripe actions for it", () => {
  const t = read("app/dashboard/billing/BillingContent.tsx");
  assert.match(t, /complimentary_access/);
  assert.match(t, /Complimentary owner access/);
  assert.match(t, /!isComplimentary && \(isActive \|\| isPastDue\)/); // no billing-portal button
});

test("no email-based or hardcoded paid-access bypass was added to entitlement code", () => {
  for (const f of ["lib/subscription.ts", "lib/entitlements.ts", "lib/subscriptionGate.ts"]) {
    const t = read(f);
    assert.doesNotMatch(t, /@gmail\.com|ADMIN_EMAIL|\.email\s*===/i, f);
  }
});

test("the migration adds only a constrained nullable column and grants nothing to browsers", () => {
  const sql = fs.readFileSync(path.join(SRC, "..", "supabase-migration-044-complimentary-access.sql"), "utf8");
  assert.match(sql, /add column if not exists complimentary_access text/);
  assert.match(sql, /complimentary_access in \('owner'\)/);
  const code = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  assert.doesNotMatch(code, /\bgrant\b/i);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
