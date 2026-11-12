// Migration 041 concurrency / authorization / role test on a REAL local PostgreSQL.
// NOT part of the app or its dependencies. Run from a scratch folder that has:
//   npm i embedded-postgres@17.11.0-beta.19 pg@8.23.1 --save-exact --ignore-scripts
//   node 041-concurrency.mjs <path-to>/supabase-migration-041-showing-requests.sql <path-to>/supabase-migration-041-ROLLBACK.sql
// Localhost only, synthetic data, no credentials, no admin rights. Roles anon/authenticated/service_role are
// SIMULATED (plain Postgres roles), not Supabase's PostgREST/JWT layer.
// Two-or-more INDEPENDENT connection concurrency test of migration 041's confirm_showing_request,
// on a real local PostgreSQL 17 (embedded-postgres, localhost only, synthetic data, no credentials).
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const MIG = fs.readFileSync(process.argv[2], "utf8");
const PORT = 54501;
const dataDir = path.resolve("./pgdata-test");
fs.rmSync(dataDir, { recursive: true, force: true });
const server = new EmbeddedPostgres({ databaseDir: dataDir, user: "postgres", password: "local-test-only", port: PORT, persistent: false });
let pass = 0, fail = 0;
const check = (name, cond, extra = "") => { (cond ? pass++ : fail++); console.log((cond ? "PASS " : "FAIL ") + name + (extra ? "  " + extra : "")); };
const conn = async (db = "lf_test") => { const c = new pg.Client({ host: "127.0.0.1", port: PORT, user: "postgres", password: "local-test-only", database: db }); await c.connect(); return c; };

try {
  await server.initialise();
  await server.start();
  await server.createDatabase("lf_test");
  const admin = await conn();
  const ver = (await admin.query("select version() v")).rows[0].v;
  console.log("server:", ver.slice(0, 60), "| listening on 127.0.0.1:" + PORT);
  const lst = (await admin.query("show listen_addresses")).rows[0].listen_addresses;
  check("server only listens on localhost", /localhost|127\.0\.0\.1/.test(lst), `listen_addresses=${lst}`);

  // ---- Supabase-like schema replica (production DDL from migrations 009/010; parents reduced to id columns) + roles
  await admin.query(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    create table public.agent_profiles (id uuid primary key default gen_random_uuid(), name text, timezone text);
    create table public.listings (id uuid primary key default gen_random_uuid(), agent_id uuid, created_at timestamptz default now(), timezone text);
    create table public.leads (id uuid primary key default gen_random_uuid(), created_at timestamptz default now());
    create table public.showings (
      id uuid primary key default gen_random_uuid(),
      lead_id uuid not null references public.leads(id) on delete cascade,
      listing_id uuid not null references public.listings(id) on delete cascade,
      agent_id uuid not null references public.agent_profiles(id) on delete cascade,
      showing_date date not null, showing_time text not null,
      name text not null default '', email text not null default '', phone text not null default '', message text not null default '',
      status text not null default 'confirmed' check (status in ('confirmed','completed','canceled','no_show')),
      reminder_sent boolean not null default false,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now());
    alter table public.showings add column reminder_24h_sent boolean not null default false, add column reminder_1h_sent boolean not null default false;
    alter table public.showings enable row level security;
    grant select, update on public.showings to authenticated;   -- RLS-gated like production; anon has no table access (migration 034)
  `);
  const A = (await admin.query("insert into public.agent_profiles(name) values ('Agent A') returning id")).rows[0].id;
  const B = (await admin.query("insert into public.agent_profiles(name) values ('Agent B') returning id")).rows[0].id;
  const L1 = (await admin.query("insert into public.listings(agent_id) values ($1) returning id", [A])).rows[0].id;
  const L2 = (await admin.query("insert into public.listings(agent_id) values ($1) returning id", [A])).rows[0].id;
  const LD = (await admin.query("insert into public.leads default values returning id")).rows[0].id;
  // historical rows (before the migration)
  for (const [st, t] of [["confirmed", "9:00 AM"], ["confirmed", "9:00 AM"], ["completed", "11:00 AM"], ["canceled", "12:00 PM"], ["no_show", "1:00 PM"]])
    await admin.query("insert into public.showings(lead_id,listing_id,agent_id,showing_date,showing_time,status) values ($1,$2,$3,'2026-11-20',$4,$5)", [LD, L1, A, t, st]);
  const snap = async () => (await admin.query("select md5(string_agg(id::text||status||showing_time||showing_date::text, ',' order by id)) h, count(*)::int n from public.showings where showing_date = '2026-11-20'")).rows[0];
  const before = await snap();

  await admin.query(MIG);
  const after = await snap();
  check("migration applied on real PostgreSQL; the 5 historical rows are byte-identical (hash + count)", before.h === after.h && before.n === 5);
  const old = (await admin.query("insert into public.showings(lead_id,listing_id,agent_id,showing_date,showing_time) values ($1,$2,$3,'2026-11-21','2:00 PM') returning status", [LD, L1, A])).rows[0].status;
  check("OLD-CODE style insert (no status) still yields 'confirmed' after the migration", old === "confirmed");
  await admin.query("delete from public.showings where showing_date='2026-11-21'");

  // ---- helpers
  const mk = async (listing, time, status = "requested", date = "2026-12-01", agent = A) =>
    (await admin.query("insert into public.showings(lead_id,listing_id,agent_id,showing_date,showing_time,status) values ($1,$2,$3,$4,$5,$6) returning id", [LD, listing, agent, date, time, status])).rows[0].id;
  const state = async (ids) => (await admin.query("select id,status from public.showings where id = any($1)", [ids])).rows;
  const confirmedCount = async (ids) => (await state(ids)).filter((r) => r.status === "confirmed").length;

  // N independent connections, held open; a barrier releases all callers at once
  async function race(callers, rounds, makeRound) {
    const conns = await Promise.all(callers.map(() => conn()));
    const outcomes = { tally: {}, rounds: 0, bad: 0, details: [] };
    for (let r = 0; r < rounds; r++) {
      const { calls, ids, expectWinners } = await makeRound(r);
      let release; const gate = new Promise((res) => (release = res));
      const running = calls.map((c, i) => (async () => { await gate; return conns[i % conns.length].query("select public.confirm_showing_request($1,$2) r", [c.id, c.agent]).then((x) => x.rows[0].r); })());
      await new Promise((r2) => setTimeout(r2, 5)); // all connections are parked on the gate
      release();
      const res = await Promise.all(running);
      res.forEach((x) => (outcomes.tally[x] = (outcomes.tally[x] || 0) + 1));
      const winners = await confirmedCount(ids);
      outcomes.rounds++;
      if (winners !== expectWinners) { outcomes.bad++; if (outcomes.details.length < 3) outcomes.details.push({ round: r, res, winners }); }
    }
    await Promise.all(conns.map((c) => c.end()));
    return outcomes;
  }

  // ---- 1. REAL function, no artificial delay: two competing confirmations, 300 rounds
  let day = 0; const nextDate = () => `2027-01-${String(1 + (day++ % 28)).padStart(2, "0")}`;
  let o = await race([0, 1], 300, async (r) => {
    const d = `2028-${String(1 + (r % 12)).padStart(2, "0")}-${String(1 + Math.floor(r / 12)).padStart(2, "0")}`;
    const x = await mk(L1, "10:00 AM", "requested", d), y = await mk(L1, r % 2 ? "10:00 AM" : "10:15 AM", "requested", d);
    return { calls: [{ id: x, agent: A }, { id: y, agent: A }], ids: [x, y], expectWinners: 1 };
  });
  check("REAL function: 300 rounds x 2 independent connections released together on a barrier: exactly ONE overlapping confirmation wins every round", o.bad === 0, JSON.stringify(o.tally));

  // ---- 2. 8 independent connections confirming 8 overlapping requests at once, 60 rounds
  o = await race(Array.from({ length: 8 }, (_, i) => i), 60, async (r) => {
    const d = `2029-${String(1 + (r % 12)).padStart(2, "0")}-${String(1 + Math.floor(r / 12)).padStart(2, "0")}`;
    const ids = []; for (let i = 0; i < 8; i++) ids.push(await mk(L1, ["10:00 AM", "10:00 AM", "10:15 AM", "10:00 AM", "10:15 AM", "10:00 AM", "10:00 AM", "10:15 AM"][i], "requested", d));
    return { calls: ids.map((id) => ({ id, agent: A })), ids, expectWinners: 1 };
  });
  check("REAL function: 60 rounds x 8 connections, 8 overlapping requests: exactly one winner per round", o.bad === 0, JSON.stringify(o.tally));

  // ---- 3. NEGATIVE CONTROL: widen the race window between the conflict check and the update, with and without the lock
  const inject = (sql, name, removeLock) => {
    let s = sql.replace(/create or replace function public\.confirm_showing_request\(/, `create or replace function public.${name}(`);
    s = s.replace("  update public.showings set status = 'confirmed'", "  perform pg_sleep(0.05);\n  update public.showings set status = 'confirmed'");
    if (removeLock) s = s.replace(/  perform pg_advisory_xact_lock\([^;]*;\n/, "");
    return s;
  };
  const fnBlock = MIG.slice(MIG.indexOf("create or replace function public.confirm_showing_request"), MIG.indexOf("revoke all on function public.confirm_showing_request"));
  await admin.query(inject(fnBlock, "confirm_with_lock_slow", false));
  await admin.query(inject(fnBlock, "confirm_no_lock_slow", true));
  const slowRace = async (fnName, rounds) => {
    const [c1, c2] = await Promise.all([conn(), conn()]); let double = 0;
    for (let r = 0; r < rounds; r++) {
      const d = `2030-${String(1 + (r % 12)).padStart(2, "0")}-${String(1 + Math.floor(r / 12)).padStart(2, "0")}`;
      const x = await mk(L1, "10:00 AM", "requested", d), y = await mk(L1, "10:00 AM", "requested", d);
      let rel; const gate = new Promise((res) => (rel = res));
      const p1 = (async () => { await gate; return c1.query(`select public.${fnName}($1,$2) r`, [x, A]); })();
      const p2 = (async () => { await gate; return c2.query(`select public.${fnName}($1,$2) r`, [y, A]); })();
      await new Promise((r2) => setTimeout(r2, 5)); rel(); await Promise.all([p1, p2]);
      if ((await confirmedCount([x, y])) === 2) double++;
    }
    await c1.end(); await c2.end(); return double;
  };
  const dblNoLock = await slowRace("confirm_no_lock_slow", 20);
  const dblLock = await slowRace("confirm_with_lock_slow", 20);
  check("NEGATIVE CONTROL: without the advisory lock the same harness DOES double-confirm (the test can detect the race)", dblNoLock > 0, `${dblNoLock}/20 rounds double-confirmed`);
  check("with the lock and the same artificial 50 ms window: 0 double confirmations", dblLock === 0, `${dblLock}/20`);

  // ---- 4. non-overlapping outcomes, concurrently
  o = await race([0, 1], 40, async (r) => {
    const d = `2031-${String(1 + (r % 12)).padStart(2, "0")}-${String(1 + Math.floor(r / 12)).padStart(2, "0")}`;
    const x = await mk(L1, "10:00 AM", "requested", d), y = await mk(L1, "10:30 AM", "requested", d);
    return { calls: [{ id: x, agent: A }, { id: y, agent: A }], ids: [x, y], expectWinners: 2 };
  });
  check("ADJACENT slots (10:00 and 10:30) confirmed concurrently: both succeed, 40/40 rounds", o.bad === 0, JSON.stringify(o.tally));
  o = await race([0, 1], 40, async (r) => {
    const mm = String(1 + (r % 12)).padStart(2, "0"), dd = String(1 + Math.floor(r / 12)).padStart(2, "0");
    const x = await mk(L1, "10:00 AM", "requested", `2040-${mm}-${dd}`), y = await mk(L1, "10:00 AM", "requested", `2041-${mm}-${dd}`);
    return { calls: [{ id: x, agent: A }, { id: y, agent: A }], ids: [x, y], expectWinners: 2 };
  });
  check("same time on DIFFERENT dates: both succeed", o.bad === 0, JSON.stringify(o.tally));
  o = await race([0, 1], 40, async (r) => {
    const d = `2033-${String(1 + (r % 12)).padStart(2, "0")}-${String(1 + Math.floor(r / 12)).padStart(2, "0")}`;
    const x = await mk(L1, "10:00 AM", "requested", d), y = await mk(L2, "10:00 AM", "requested", d);
    return { calls: [{ id: x, agent: A }, { id: y, agent: A }], ids: [x, y], expectWinners: 2 };
  });
  check("same time on DIFFERENT listings: both succeed", o.bad === 0, JSON.stringify(o.tally));

  // ---- 5. cross-owner
  const x1 = await mk(L1, "3:00 PM", "requested", "2034-03-01");
  const wrong = (await admin.query("select public.confirm_showing_request($1,$2) r", [x1, B])).rows[0].r;
  check("another agent calling confirm on this agent's request: not_found, row still requested", wrong === "not_found" && (await state([x1]))[0].status === "requested");
  const decl = await admin.query("update public.showings set status='declined', responded_at=now() where id=$1 and agent_id=$2 and status='requested' returning id", [x1, B]);
  check("another agent declining (the app's decline statement): 0 rows matched, still requested", decl.rowCount === 0 && (await state([x1]))[0].status === "requested");
  o = await race([0, 1], 40, async (r) => {
    const d = `2035-${String(1 + (r % 12)).padStart(2, "0")}-${String(1 + Math.floor(r / 12)).padStart(2, "0")}`;
    const x = await mk(L1, "10:00 AM", "requested", d);
    return { calls: [{ id: x, agent: B }, { id: x, agent: A }], ids: [x], expectWinners: 1 };
  });
  check("owner and an intruder race on the same request: the owner wins, the intruder gets not_found, 40/40 rounds", o.bad === 0 && (o.tally.not_found || 0) === 40, JSON.stringify(o.tally));

  // ---- 6. role privileges (SIMULATED Supabase roles)
  const fnSig = "public.confirm_showing_request(uuid,uuid,timestamptz)";
  const rid = await mk(L1, "4:00 PM", "requested", "2036-04-01");
  const tryAs = async (role) => { const c = await conn(); try { await c.query(`set role ${role}`); const r = await c.query("select public.confirm_showing_request($1,$2) r", [rid, A]); return "ok:" + r.rows[0].r; } catch (e) { return "denied:" + e.code; } finally { await c.end(); } };
  const anon = await tryAs("anon"), authd = await tryAs("authenticated");
  check("anon cannot execute the function (permission denied 42501)", anon === "denied:42501", anon);
  check("authenticated cannot execute the function (permission denied 42501)", authd === "denied:42501", authd);
  check("neither role changed the row", (await state([rid]))[0].status === "requested");
  const svc = await tryAs("service_role");
  check("service_role can execute it and confirms", svc === "ok:confirmed", svc);
  const c2 = await conn(); await c2.query("set role anon");
  let anonTable = "ok"; try { await c2.query("select * from public.showings limit 1"); } catch (e) { anonTable = e.code; } await c2.end();
  check("anon has no direct table access to showings", anonTable === "42501", anonTable);

  // ---- 7. rollback compatibility on real PostgreSQL
  const roll = fs.readFileSync(process.argv[3], "utf8");
  await admin.query(roll);
  const afterRoll = await snap();
  check("rollback script runs; the historical rows are still byte-identical", afterRoll.h === before.h);
  const oldAfter = (await admin.query("insert into public.showings(lead_id,listing_id,agent_id,showing_date,showing_time) values ($1,$2,$3,'2037-01-01','9:00 AM') returning status", [LD, L1, A])).rows[0].status;
  check("rollback: old-style insert works; new statuses are rejected again", oldAfter === "confirmed" && await admin.query("insert into public.showings(lead_id,listing_id,agent_id,showing_date,showing_time,status) values ($1,$2,$3,'2037-01-02','9:00 AM','requested')", [LD, L1, A]).then(() => false, () => true));

  await admin.end();
} catch (e) {
  fail++; console.log("ERROR:", e && e.stack ? e.stack.split("\n").slice(0, 4).join(" | ") : e);
} finally {
  try { await server.stop(); } catch {}
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
