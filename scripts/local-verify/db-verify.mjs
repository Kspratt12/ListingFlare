// Local database verification for ListingFlare migrations, using PGlite (Postgres compiled to WASM)
// with a minimal Supabase shim (roles anon/authenticated/service_role, auth.uid() from JWT claims,
// storage schema stubs). Fictional rows only. This is NOT a real Supabase project: PostgREST, Supabase
// Auth, Storage and the production schema's manual grants are not present.
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";

const REPO = process.argv[2];
const db = new PGlite();
const log = (...a) => console.log(...a);
let pass = 0, fail = 0;
const ok = (c, name, extra = "") => { if (c) { pass++; log("PASS", name); } else { fail++; log("FAIL", name, extra); } };

const SHIM = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean default false);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
-- TEST-ONLY stand-in for pgcrypto's gen_random_bytes (not cryptographically secure; local replay only).
create function public.gen_random_bytes(n integer) returns bytea language sql volatile as $$
  select substring(decode(string_agg(md5(random()::text || clock_timestamp()::text), ''), 'hex') from 1 for n)
  from generate_series(1, greatest(1, (n + 15) / 16))
$$;
`;
// PGlite ships no pgcrypto/uuid-ossp; gen_random_uuid() is built in. Extension statements are no-ops here.
const stripExtensions = (sql) => sql.replace(/create\s+extension[^;]*;/gi, "select 1;");

function migrationOrder() {
  const files = fs.readdirSync(REPO).filter((f) => /^supabase-.*\.sql$/.test(f));
  const skip = (f) => /ROLLBACK|SYNTHETIC|OWNER-DATA-NOT-RUN/i.test(f);
  const num = (f) => {
    const m = f.match(/supabase-migration-(\d{3})/);
    if (m) return Number(m[1]);
    if (f === "supabase-migration-a2-lock-follow-ups-updates.sql") return 36.5;
    return null;
  };
  const ordered = ["supabase-schema.sql", "supabase-billing-migration.sql", "supabase-fix-profile-name.sql"].filter((f) => files.includes(f));
  const numbered = files.filter((f) => !skip(f) && num(f) !== null).sort((a, b) => num(a) - num(b) || a.localeCompare(b));
  return [...ordered, ...numbered];
}

async function asRole(role, sub, fn) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ""}', false); select set_config('request.jwt.claim.role', '${role}', false); set role ${role};`);
  try { return await fn(); } finally { await db.exec("reset role;"); }
}
async function tryq(sql, params) {
  try { return { rows: (await db.query(sql, params)).rows, error: null }; } catch (e) { return { rows: null, error: e }; }
}

await db.exec(SHIM);
const results = [];
for (const f of migrationOrder()) {
  const sql = stripExtensions(fs.readFileSync(path.join(REPO, f), "utf8"));
  try {
    await db.exec(sql);
    results.push([f, "ok"]);
  } catch (e) {
    try { await db.exec("rollback;"); } catch {}
    results.push([f, `ERROR: ${String(e.message).split("\n")[0].slice(0, 140)}`]);
  }
}
log("== migration replay (repo files in order) ==");
for (const [f, r] of results) log(r === "ok" ? "  ok   " : "  FAIL ", f, r === "ok" ? "" : r);
const failedFiles = results.filter(([, r]) => r !== "ok").map(([f]) => f);
for (const f of ["supabase-migration-045-agent-site-and-ai-knowledge.sql", "supabase-migration-046-custom-domains.sql", "supabase-migration-047-seller-report-schedules.sql", "supabase-migration-048-floor-plans.sql"]) {
  ok(!failedFiles.includes(f), `new migration applies: ${f}`);
}

// ---------- fixtures (as superuser) ----------
const A = "00000000-0000-4000-8000-0000000000a1", B = "00000000-0000-4000-8000-0000000000b2";
await db.exec(`
insert into auth.users(id, email) values ('${A}', 'a@example.invalid'), ('${B}', 'b@example.invalid') on conflict do nothing;
insert into public.agent_profiles(id, name, email) values ('${A}', 'Agent A', 'a@example.invalid'), ('${B}', 'Agent B', 'b@example.invalid') on conflict (id) do nothing;
`);
const la = (await db.query(`insert into public.listings(agent_id, status, street, city, state) values ($1, 'published', '1 A St', 'X', 'NC') returning id`, [A])).rows[0].id;
const lad = (await db.query(`insert into public.listings(agent_id, status, street, city, state) values ($1, 'draft', '2 A Draft', 'X', 'NC') returning id`, [A])).rows[0].id;
const lb = (await db.query(`insert into public.listings(agent_id, status, street, city, state) values ($1, 'published', '1 B St', 'X', 'NC') returning id`, [B])).rows[0].id;

// ---------- 045: private notes, ai_knowledge, show_other_listings ----------
log("== 045 ==");
await db.query(`insert into public.listing_private_notes(listing_id, agent_id, notes) values ($1, $2, 'SECRET A')`, [la, A]);
await asRole("anon", "", async () => {
  const r = await tryq(`select * from public.listing_private_notes`);
  ok(r.error && /permission denied/.test(r.error.message), "anon cannot read private notes", r.error?.message);
  const pub = await tryq(`select street from public.listings`);
  ok(pub.rows && pub.rows.every((x) => x.street !== "2 A Draft"), "anon sees no draft listings through the public policy", JSON.stringify(pub.rows || pub.error?.message));
});
await asRole("authenticated", A, async () => {
  const own = await tryq(`select notes from public.listing_private_notes`);
  ok(own.rows?.length === 1 && own.rows[0].notes === "SECRET A", "owner reads own notes");
  const forB = await tryq(`insert into public.listing_private_notes(listing_id, agent_id, notes) values ($1, $2, 'x')`, [lb, A]);
  ok(!!forB.error, "owner cannot attach notes to another agent's listing");
  const asB = await tryq(`insert into public.listing_private_notes(listing_id, agent_id, notes) values ($1, $2, 'x')`, [lad, B]);
  ok(!!asB.error, "cannot write notes claiming another agent id");
  const upd = await tryq(`update public.agent_profiles set show_other_listings = true where id = $1 returning id`, [A]);
  ok(!upd.error && upd.rows.length === 1, "owner can switch on show_other_listings", upd.error?.message);
  const updB = await tryq(`update public.agent_profiles set show_other_listings = true where id = $1 returning id`, [B]);
  ok(!updB.error && updB.rows.length === 0, "owner cannot change another agent's profile", updB.error?.message);
  const k = await tryq(`update public.listings set ai_knowledge = 'Roof 2022' where id = $1 returning id`, [la]);
  ok(!k.error && k.rows.length === 1, "owner can save ai_knowledge on own listing", k.error?.message);
});
await asRole("authenticated", B, async () => {
  const r = await tryq(`select * from public.listing_private_notes`);
  ok(r.rows?.length === 0, "another agent sees none of A's notes");
});
const long = await tryq(`update public.listings set ai_knowledge = repeat('x', 4001) where id = $1`, [la]);
ok(!!long.error, "ai_knowledge over 4000 chars rejected by constraint");
const def = (await db.query(`select show_other_listings from public.agent_profiles where id = $1`, [B])).rows[0];
ok(def.show_other_listings === false, "existing profiles default show_other_listings to false");

// ---------- 046: custom domains ----------
log("== 046 ==");
const ins = (agent, host, status = "pending") => tryq(`insert into public.agent_custom_domains(agent_id, hostname, status) values ($1, $2, $3) returning id`, [agent, host, status]);
ok(!(await ins(A, "homes.janesmith.com")).error, "service can insert a claim");
const dup = await ins(B, "homes.janesmith.com");
ok(dup.error?.code === "23505", "second live claim of the same hostname fails (unique)", dup.error?.message);
const second = await ins(A, "other.janesmith.com");
ok(second.error?.code === "23505", "one live domain per agent", second.error?.message);
for (const bad of ["Homes.JaneSmith.com", "x.listingflare.com", "listingflare.com", "nodot", "-bad.com"]) {
  ok(!!(await ins(B, bad)).error, `hostname constraint rejects ${bad}`);
}
await asRole("anon", "", async () => {
  const r = await tryq(`select * from public.agent_custom_domains`);
  ok(!!r.error, "anon cannot read the domains table");
  const pend = await tryq(`select * from public.resolve_custom_domain('homes.janesmith.com')`);
  ok(pend.rows?.length === 0, "resolver ignores domains that are not connected", pend.error?.message);
});
await db.query(`update public.agent_custom_domains set status = 'connected' where hostname = 'homes.janesmith.com'`);
await asRole("anon", "", async () => {
  const r = await tryq(`select * from public.resolve_custom_domain('HOMES.janesmith.com')`);
  ok(r.rows?.length === 1 && r.rows[0].agent_id === A && Object.keys(r.rows[0]).sort().join() === "agent_id,handle", "resolver returns only agent id + handle for a connected host", JSON.stringify(r.rows || r.error?.message));
});
await asRole("authenticated", A, async () => {
  const r = await tryq(`select hostname from public.agent_custom_domains`);
  ok(r.rows?.length === 1, "owner reads own domain");
  const w = await tryq(`update public.agent_custom_domains set status = 'connected' where agent_id = $1`, [A]);
  ok(!!w.error, "browser cannot change domain status", w.error?.message);
  const i = await tryq(`insert into public.agent_custom_domains(agent_id, hostname) values ($1, 'a.example.com')`, [A]);
  ok(!!i.error, "browser cannot insert domain claims");
});
await asRole("authenticated", B, async () => {
  const r = await tryq(`select hostname from public.agent_custom_domains`);
  ok(r.rows?.length === 0, "other agent cannot see A's domain");
});
await db.query(`update public.agent_custom_domains set status = 'removed' where hostname = 'homes.janesmith.com'`);
ok(!(await ins(B, "homes.janesmith.com")).error, "a removed hostname can be claimed again");

// ---------- 047: seller report schedules ----------
log("== 047 ==");
const portal = (await db.query(`insert into public.seller_portals(listing_id, agent_id, seller_email, access_token) values ($1, $2, 'seller@example.invalid', 'tok1') returning id`, [la, A])).rows[0].id;
const sched = (await db.query(`insert into public.seller_report_schedules(listing_id, agent_id, seller_portal_id, enabled, next_run_at) values ($1, $2, $3, true, now()) returning id`, [la, A, portal])).rows[0].id;
const sendIns = () => tryq(`insert into public.seller_report_sends(schedule_id, agent_id, listing_id, period_start, period_end, status) values ($1, $2, $3, '2026-11-16T14:00Z', '2026-11-23T14:00Z', 'sending') returning id`, [sched, A, la]);
ok(!(await sendIns()).error, "first claim for a period succeeds");
const dupSend = await sendIns();
ok(dupSend.error?.code === "23505", "second claim for the same period fails (no double send)", dupSend.error?.message);
// conditional re-claim: only one of two concurrent updates from attempts=1 wins
await db.query(`update public.seller_report_sends set status='failed' where schedule_id=$1`, [sched]);
const u1 = await db.query(`update public.seller_report_sends set attempts=2, status='sending' where schedule_id=$1 and attempts=1 and status='failed' returning id`, [sched]);
const u2 = await db.query(`update public.seller_report_sends set attempts=2, status='sending' where schedule_id=$1 and attempts=1 and status='failed' returning id`, [sched]);
ok(u1.rows.length === 1 && u2.rows.length === 0, "conditional re-claim lets exactly one caller win");
ok(!!(await tryq(`update public.seller_report_sends set status='delivered' where schedule_id=$1`, [sched])).error, "status 'delivered' is not a valid state (provider acceptance only)");
ok(!!(await tryq(`insert into public.seller_report_schedules(listing_id, agent_id) values ($1, $2)`, [la, A])).error, "one schedule per listing");
ok(!!(await tryq(`update public.seller_report_schedules set send_hour = 24 where id = $1`, [sched])).error, "send_hour range enforced");
await asRole("authenticated", A, async () => {
  ok((await tryq(`select id from public.seller_report_schedules`)).rows?.length === 1, "owner reads own schedule");
  ok((await tryq(`select id from public.seller_report_sends`)).rows?.length === 1, "owner reads own send history");
  ok(!!(await tryq(`update public.seller_report_schedules set enabled = false`)).error, "browser cannot write schedules (API only)");
  ok(!!(await tryq(`insert into public.seller_report_sends(schedule_id, agent_id, listing_id, period_start, period_end, status) values ($1,$2,$3,now(),now(),'accepted')`, [sched, A, la])).error, "browser cannot forge send records");
});
await asRole("authenticated", B, async () => {
  ok((await tryq(`select id from public.seller_report_schedules`)).rows?.length === 0, "other agent cannot see A's schedules");
});
await asRole("anon", "", async () => {
  ok(!!(await tryq(`select id from public.seller_report_schedules`)).error, "anon cannot read schedules");
});
await db.query(`update public.seller_portals set active = false where id = $1`, [portal]);
await db.query(`delete from public.seller_portals where id = $1`, [portal]);
const after = (await db.query(`select seller_portal_id from public.seller_report_schedules where id = $1`, [sched])).rows[0];
ok(after.seller_portal_id === null, "deleting the seller portal detaches the schedule (no stale recipient)");

// ---------- 048: floor plans ----------
log("== 048 ==");
const good = JSON.stringify({ image: { src: "https://x.invalid/p.png", width: 10, height: 10 }, markers: [] });
await asRole("authenticated", A, async () => {
  const r = await tryq(`update public.listings set floor_plan = $2::jsonb where id = $1 returning id`, [la, good]);
  ok(!r.error && r.rows.length === 1, "owner saves a floor plan on own listing", r.error?.message);
  const o = await tryq(`update public.listings set floor_plan = $2::jsonb where id = $1 returning id`, [lb, good]);
  ok(!o.error && o.rows.length === 0, "owner cannot change another agent's floor plan");
});
ok(!!(await tryq(`update public.listings set floor_plan = '"x"'::jsonb where id = $1`, [la])).error, "non-object floor plan rejected");
ok(!!(await tryq(`update public.listings set floor_plan = $2::jsonb where id = $1`, [la, JSON.stringify({ image: {}, markers: Array.from({ length: 41 }, () => ({})) })])).error, "more than 40 markers rejected");
await asRole("anon", "", async () => {
  const r = await tryq(`select floor_plan from public.listings where id = $1`, [la]);
  ok(r.rows?.length === 1 && r.rows[0].floor_plan, "public published listing exposes its floor plan (public content)");
  const d = await tryq(`select floor_plan from public.listings where id = $1`, [lad]);
  ok(d.rows?.length === 0, "a draft listing's floor plan is not public");
});

// ---------- informational: protected profile fields on a repo-only database ----------
log("== informational (pre-existing, not changed by this work) ==");
await asRole("authenticated", A, async () => {
  for (const col of ["subscription_status", "complimentary_access", "stripe_customer_id", "trial_ends_at"]) {
    const v = col === "trial_ends_at" ? "now() + interval '10 years'" : col === "complimentary_access" ? "'owner'" : "'active'";
    const r = await tryq(`update public.agent_profiles set ${col} = ${v} where id = $1 returning id`, [A]);
    log(`INFO owner update of agent_profiles.${col}: ${r.error ? "DENIED (" + r.error.message.slice(0, 60) + ")" : r.rows.length ? "ALLOWED" : "no row"}`);
  }
});

// ---------- 049: column grants ----------
log("== 049 ==");
await db.exec(fs.readFileSync(path.join(REPO, "supabase-migration-049-agent-profile-column-grants.sql"), "utf8"));
await asRole("authenticated", A, async () => {
  for (const col of ["subscription_status", "complimentary_access", "stripe_customer_id", "trial_ends_at", "google_refresh_token", "email"]) {
    const r = await tryq(`update public.agent_profiles set ${col} = null where id = $1`, [A]);
    ok(!!r.error && /permission denied/.test(r.error.message), `after 049 the browser cannot update ${col}`, r.error?.message || "allowed");
  }
  for (const [col, v] of [["name", "'New Name'"], ["brand_color", "'#123456'"], ["ai_approval_mode", "true"], ["show_other_listings", "false"]]) {
    const r = await tryq(`update public.agent_profiles set ${col} = ${v} where id = $1 returning id`, [A]);
    ok(!r.error && r.rows.length === 1, `after 049 the browser can still update ${col}`, r.error?.message);
  }
});
await asRole("service_role", "", async () => {
  const r = await tryq(`update public.agent_profiles set subscription_status = 'active' where id = $1 returning id`, [A]);
  ok(!r.error && r.rows.length === 1, "server (service role) writes are unaffected", r.error?.message);
});

// ---------- old-code compatibility ----------
log("== compatibility ==");
const oldCols = "id, agent_id, status, slug, street, city, state, zip, price, beds, baths, sqft, photos, videos, virtual_tour_url, view_count, created_at, ai_chat_enabled";
ok(!(await tryq(`select ${oldCols} from public.listings`)).error, "previous app's listing select still works after 045-048");
ok(!(await tryq(`insert into public.listings(agent_id, status, street) values ($1, 'draft', 'old-code insert')`, [A])).error, "previous app's listing insert (without new columns) still works");
ok(!(await tryq(`select id, name, email, phone, handle from public.agent_profiles`)).error, "previous app's profile select still works");

// ---------- rollbacks ----------
log("== rollbacks ==");
for (const f of ["supabase-migration-048-ROLLBACK.sql", "supabase-migration-047-ROLLBACK.sql", "supabase-migration-046-ROLLBACK.sql", "supabase-migration-045-ROLLBACK.sql"]) {
  let err = null;
  try { await db.exec(fs.readFileSync(path.join(REPO, f), "utf8")); } catch (e) { err = e; try { await db.exec("rollback;"); } catch {} }
  ok(!err, `rollback runs: ${f}`, err?.message);
}
ok(!(await tryq(`select ${oldCols} from public.listings`)).error, "previous app's listing select works after all rollbacks");

log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
