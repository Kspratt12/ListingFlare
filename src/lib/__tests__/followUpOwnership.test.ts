import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// A2 (code half): a follow_ups row is writable by its owning agent, so the send job must not trust its
// lead_id / listing_id. Both lookups are scoped to the follow-up's own agent. (The database half, a
// column-level UPDATE grant, is a separate owner-run migration; this guard stands on its own.)
test("the follow-up send job only loads the lead and listing that belong to the follow-up's agent", () => {
  const src = fs.readFileSync(path.join(process.env.LF_SRC_DIR as string, "app/api/follow-ups/process/route.ts"), "utf8");
  const lead = /\.from\("leads"\)[\s\S]{0,260}?\.eq\("id", followUp\.lead_id\)[\s\S]{0,120}?\.eq\("agent_id", followUp\.agent_id\)/;
  const listing = /\.from\("listings"\)[\s\S]{0,260}?\.eq\("id", followUp\.listing_id\)[\s\S]{0,120}?\.eq\("agent_id", followUp\.agent_id\)/;
  assert.match(src, lead);
  assert.match(src, listing);
});

assertNoNetworkAttempts();
