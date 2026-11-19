// Access-rule checks against a REAL Supabase project (the isolated listingflare-release-test project,
// never production). Uses PostgREST, Auth and Storage through supabase-js with synthetic users/data.
//
// Env (values are never printed): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
// Refuses to run against the production project ref.
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROD_REF = "pvnsirpfofxklqgxwdiz";
if (!URL_ || !ANON || !SERVICE) throw new Error("missing env");
if (URL_.includes(PROD_REF)) throw new Error("refusing to run against production");
const phase = process.argv[2] || "all"; // "pre049" | "post049" | "all"

let pass = 0, fail = 0;
const ok = (c, name, extra = "") => { c ? pass++ : fail++; console.log(c ? "PASS" : "FAIL", name, c ? "" : String(extra).slice(0, 200)); };
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const anon = createClient(URL_, ANON, { auth: { persistSession: false } });

async function user(tag) {
  const email = `lf-release-${tag}-${crypto.randomBytes(4).toString("hex")}@example.invalid`;
  const password = crypto.randomBytes(18).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`createUser ${tag}: ${error.message}`);
  const c = createClient(URL_, ANON, { auth: { persistSession: false } });
  const s = await c.auth.signInWithPassword({ email, password });
  if (s.error) throw new Error(`signIn ${tag}: ${s.error.message}`);
  return { id: data.user.id, c };
}

const A = await user("a");
const B = await user("b");
// Profiles: created by trigger in some schemas; make sure they exist (service role).
for (const u of [A, B]) await admin.from("agent_profiles").upsert({ id: u.id, name: `Synthetic ${u.id.slice(0, 4)}`, email: "synthetic@example.invalid" });
const ins = async (agent, status, street) => (await admin.from("listings").insert({ agent_id: agent, status, street, city: "Testville", state: "NC", slug: `${street.toLowerCase().replace(/\W+/g, "-")}-${crypto.randomBytes(3).toString("hex")}` }).select("id").single()).data.id;
const la = await ins(A.id, "published", "1 Synthetic Way");
const lad = await ins(A.id, "draft", "2 Synthetic Draft");
const lb = await ins(B.id, "published", "3 Other Synthetic");

// ---- 045 private notes / ai_knowledge / show_other_listings
const n1 = await A.c.from("listing_private_notes").insert({ listing_id: la, agent_id: A.id, notes: "SYNTHETIC SECRET" }).select("listing_id");
ok(!n1.error && n1.data.length === 1, "owner can write private notes on own listing", n1.error?.message);
const n2 = await A.c.from("listing_private_notes").insert({ listing_id: lb, agent_id: A.id, notes: "x" });
ok(!!n2.error, "owner cannot attach notes to another agent's listing");
const n3 = await anon.from("listing_private_notes").select("*");
ok(!!n3.error || n3.data.length === 0, "anon cannot read private notes", JSON.stringify(n3.data));
const n4 = await B.c.from("listing_private_notes").select("*");
ok(!n4.error && n4.data.length === 0, "another agent sees no private notes");
const pub = await anon.from("listings").select("*").eq("id", la).single();
ok(!pub.error && !JSON.stringify(pub.data).includes("SYNTHETIC SECRET"), "public listing payload has no private notes");
const dr = await anon.from("listings").select("id").eq("id", lad);
ok(!dr.error && dr.data.length === 0, "anon cannot read a draft listing");
const k = await A.c.from("listings").update({ ai_knowledge: "Roof 2022" }).eq("id", la).select("id");
ok(!k.error && k.data.length === 1, "owner can save ai_knowledge", k.error?.message);
const kb = await A.c.from("listings").update({ ai_knowledge: "x" }).eq("id", lb).select("id");
ok(!kb.error && kb.data.length === 0, "owner cannot change another agent's listing");
const so = await A.c.from("agent_profiles").update({ show_other_listings: true }).eq("id", A.id).select("id");
ok(!so.error && so.data.length === 1, "owner can switch show_other_listings", so.error?.message);

// ---- protected profile fields (before/after 049)
for (const col of ["subscription_status", "trial_ends_at"]) {
  const v = col === "trial_ends_at" ? new Date(Date.now() + 3650 * 864e5).toISOString() : "active";
  const r = await A.c.from("agent_profiles").update({ [col]: v }).eq("id", A.id).select("id");
  const changed = !r.error && r.data.length === 1;
  if (phase === "post049") ok(!changed, `after 049 the browser cannot update ${col}`, r.error?.message || "allowed");
  else console.log(`INFO browser update of ${col}: ${changed ? "ALLOWED" : "DENIED"} ${r.error ? "(" + r.error.message.slice(0, 60) + ")" : ""}`);
}
if (phase === "post049") {
  for (const [col, v] of [["name", "Synthetic Renamed"], ["brand_color", "#123456"], ["ai_approval_mode", true], ["show_other_listings", false]]) {
    const r = await A.c.from("agent_profiles").update({ [col]: v }).eq("id", A.id).select("id");
    ok(!r.error && r.data.length === 1, `after 049 the browser can still update ${col}`, r.error?.message);
  }
}

// ---- 048 floor plan + storage
const fp = { image: { src: "https://example.invalid/p.png", width: 10, height: 10 }, markers: [] };
const f1 = await A.c.from("listings").update({ floor_plan: fp }).eq("id", la).select("id");
ok(!f1.error && f1.data.length === 1, "owner saves a floor plan", f1.error?.message);
const f2 = await A.c.from("listings").update({ floor_plan: { image: {}, markers: Array.from({ length: 41 }, () => ({})) } }).eq("id", la);
ok(!!f2.error, "more than 40 markers rejected by the database");
const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c49444154789c63f8cfc000000301010018dd8db40000000049454e44ae426082", "hex");
const up1 = await A.c.storage.from("listing-photos").upload(`${A.id}/floor-plan-release-test.png`, png, { contentType: "image/png", upsert: true });
ok(!up1.error, "owner can upload into their own storage folder", up1.error?.message);
const up2 = await A.c.storage.from("listing-photos").upload(`${B.id}/intrusion.png`, png, { contentType: "image/png", upsert: true });
ok(!!up2.error, "owner cannot upload into another agent's storage folder");
const up3 = await anon.storage.from("listing-photos").upload(`${A.id}/anon.png`, png, { contentType: "image/png" });
ok(!!up3.error, "anonymous upload refused");

// ---- 047 seller reports
const portal = (await admin.from("seller_portals").insert({ listing_id: la, agent_id: A.id, seller_email: "seller@example.invalid", access_token: crypto.randomBytes(16).toString("hex") }).select("id").single()).data.id;
const sch = await admin.from("seller_report_schedules").insert({ listing_id: la, agent_id: A.id, seller_portal_id: portal, enabled: false }).select("id").single();
ok(!sch.error, "service role creates a schedule", sch.error?.message);
ok(((await A.c.from("seller_report_schedules").select("id")).data || []).length === 1, "owner reads own schedule");
ok(((await B.c.from("seller_report_schedules").select("id")).data || []).length === 0, "other agent sees no schedules");
const sw = await A.c.from("seller_report_schedules").update({ enabled: true }).eq("listing_id", la).select("id");
ok(!!sw.error || sw.data.length === 0, "browser cannot write schedules");
const sp = await B.c.from("seller_portals").select("seller_email");
ok(!sp.error && sp.data.length === 0, "other agent cannot read the seller's email");
const send1 = await admin.from("seller_report_sends").insert({ schedule_id: sch.data.id, agent_id: A.id, listing_id: la, period_start: "2026-11-16T14:00:00Z", period_end: "2026-11-23T14:00:00Z", status: "sending" });
const send2 = await admin.from("seller_report_sends").insert({ schedule_id: sch.data.id, agent_id: A.id, listing_id: la, period_start: "2026-11-16T14:00:00Z", period_end: "2026-11-23T14:00:00Z", status: "sending" });
ok(!send1.error && send2.error?.code === "23505", "second claim for the same period is rejected (23505)", send2.error?.code);
const forged = await A.c.from("seller_report_sends").insert({ schedule_id: sch.data.id, agent_id: A.id, listing_id: la, period_start: "2026-11-01T00:00:00Z", period_end: "2026-11-02T00:00:00Z", status: "accepted" });
ok(!!forged.error, "browser cannot forge send records");

// ---- 046 domains
const d1 = await admin.from("agent_custom_domains").insert({ agent_id: A.id, hostname: "homes.release-test.example" }).select("id").single();
ok(!d1.error, "service role inserts a claim", d1.error?.message);
const d2 = await admin.from("agent_custom_domains").insert({ agent_id: B.id, hostname: "homes.release-test.example" });
ok(d2.error?.code === "23505", "duplicate live claim rejected", d2.error?.code);
const d3 = await admin.from("agent_custom_domains").insert({ agent_id: B.id, hostname: "x.listingflare.com" });
ok(!!d3.error, "platform hostname rejected by constraint");
ok(!!(await anon.from("agent_custom_domains").select("*")).error || ((await anon.from("agent_custom_domains").select("*")).data || []).length === 0, "anon cannot read domain claims");
const dw = await A.c.from("agent_custom_domains").update({ status: "connected" }).eq("agent_id", A.id).select("id");
ok(!!dw.error || dw.data.length === 0, "browser cannot mark a domain connected");
let rr = await anon.rpc("resolve_custom_domain", { p_host: "homes.release-test.example" });
ok(!rr.error && rr.data.length === 0, "resolver ignores unconnected domains", rr.error?.message);
await admin.from("agent_custom_domains").update({ status: "connected" }).eq("id", d1.data.id);
rr = await anon.rpc("resolve_custom_domain", { p_host: "HOMES.release-test.example" });
ok(!rr.error && rr.data.length === 1 && rr.data[0].agent_id === A.id && Object.keys(rr.data[0]).sort().join() === "agent_id,handle", "resolver returns only agent id + handle for a connected host", JSON.stringify(rr));
ok(((await B.c.from("agent_custom_domains").select("id")).data || []).length === 0, "other agent cannot see A's domain");

// ---- cleanup synthetic rows (test project only)
await admin.storage.from("listing-photos").remove([`${A.id}/floor-plan-release-test.png`]);
for (const t of ["seller_report_sends", "seller_report_schedules", "agent_custom_domains", "seller_portals", "listing_private_notes"]) await admin.from(t).delete().in("agent_id", [A.id, B.id]);
await admin.from("listings").delete().in("agent_id", [A.id, B.id]);
await admin.from("agent_profiles").delete().in("id", [A.id, B.id]);
for (const u of [A, B]) await admin.auth.admin.deleteUser(u.id);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
