// Shows what an anonymous visitor (the public anon key) can see in the database.
//
//   node scripts/check-public-access.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local and prints
// only row counts and HTTP codes, never row contents. Run it after any database change.
// Expected after migration 034: leads, agent_profiles and showings show 0 rows. Published
// listings are meant to be public, so listings may show a count.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const env = {}
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "")
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!URL || !KEY) { console.error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing in .env.local"); process.exit(1) }

// Every table the app reads, found from the source.
const tables = new Set()
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(ts|tsx)$/.test(e.name)) for (const m of fs.readFileSync(p, "utf8").matchAll(/\.from\("([a-z_]+)"\)/g)) tables.add(m[1])
  }
}
walk(path.join(ROOT, "src"))

const MEANT_TO_BE_PUBLIC = new Set(["listings"])
let exposed = 0
console.log("table".padEnd(26), "anonymous visitors can read")
for (const t of [...tables].sort()) {
  const r = await fetch(`${URL}/rest/v1/${t}?select=*&limit=0`, {
    method: "HEAD",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: "count=exact" },
  })
  const total = (r.headers.get("content-range") || "").split("/")[1]
  const rows = total === undefined ? null : Number(total)
  let note
  if (r.status === 404) note = "table not found (the code references a table that does not exist)"
  else if (rows > 0) { note = `${rows} rows${MEANT_TO_BE_PUBLIC.has(t) ? " (public by design)" : "  <-- EXPOSED"}`; if (!MEANT_TO_BE_PUBLIC.has(t)) exposed++ }
  else note = "0 rows (empty or protected)"
  console.log(t.padEnd(26), note)
}
console.log(exposed ? `\n${exposed} table(s) are readable by anyone. Apply supabase-migration-034-lock-down-public-access.sql.` : "\nNo private tables are readable by anonymous visitors.")
process.exit(exposed ? 1 : 0)
