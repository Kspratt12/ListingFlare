// Stateful local stand-in for Supabase (PostgREST, auth, storage, rpc) plus mock Vercel domains API,
// Resend and Anthropic. 127.0.0.1 only. Fictional data. Used by the browser walkthrough.
import http from "node:http";
import zlib from "node:zlib";
import crypto from "node:crypto";

export const A = "00000000-0000-4000-8000-0000000000a1";
export const B = "00000000-0000-4000-8000-0000000000b2";
const TOKENS = { "fake-token-a": A, "fake-token-b": B };

// --- tiny PNG generator (solid colour with a grid, so it is visibly an image) ---
function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
export function png(w, h, [r, g, b]) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const line = x % 40 === 0 || y % 40 === 0; const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = line ? 60 : r; raw[o + 1] = line ? 60 : g; raw[o + 2] = line ? 60 : b; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const now = Date.now();
const day = 864e5;
const BASE = "http://127.0.0.1:54321";
const storage = new Map();
storage.set("listing-photos/" + A + "/photo-1.png", { type: "image/png", body: png(640, 420, [200, 170, 120]) });
storage.set("listing-photos/" + A + "/photo-2.png", { type: "image/png", body: png(640, 420, [120, 170, 200]) });
const photo = (n) => ({ src: `${BASE}/storage/v1/object/public/listing-photos/${A}/photo-${n}.png`, alt: `Fictional photo ${n}` });

const agent = (id, over) => ({ id, handle: null, name: "Agent", title: "Agent", brokerage: "Example Realty", phone: "5555550100", email: `agent${id.slice(-2)}@example.invalid`, headshot_url: null, brand_color: "#b8965a", instagram: "", linkedin: "", zillow: "", realtor_com: "", facebook: "", website: "", calendly_url: "", license_number: "X1", subscription_status: "active", trial_ends_at: "2030-01-01T00:00:00Z", show_other_listings: false, google_refresh_token: null, ai_approval_mode: false, timezone: "America/New_York", weekly_emails: true, setup_fee_paid: true, stripe_customer_id: null, stripe_subscription_id: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", ...over });
let seq = 0;
const lid = () => `00000000-0000-4000-8000-0000000002${String(++seq).padStart(2, "0")}`;
const listing = (agent_id, status, slug, over = {}) => ({ id: lid(), agent_id, status, slug, street: `${seq} ${slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")}`, city: "Exampleville", state: "NC", zip: "27000", price: 400000 + seq * 5000, beds: 3, baths: 2, sqft: 1800, year_built: 2001, lot_size: "0.2 acres", description: `Fictional home ${seq}. All details are made up for local testing.`, features: ["Porch", "Garage"], photos: [], videos: [], virtual_tour_url: "", view_count: 12, created_at: new Date(now - (40 - seq) * day).toISOString(), updated_at: new Date(now - day).toISOString(), published_at: new Date(now - 30 * day).toISOString(), price_history: [], ai_chat_enabled: true, ai_knowledge: "", floor_plan: null, comparable_sales: [], appliances_included: [], hoa_required: false, ...over });

export const db = {
  agent_profiles: [agent(A, { handle: "fictional-agent", name: "Avery Fictional" }), agent(B, { name: "Blake Other" })],
  listings: [],
  leads: [], showings: [], offers: [], follow_ups: [], messages: [], testimonials: [], seller_prospects: [], listing_alerts: [],
  seller_portals: [], seller_report_schedules: [], seller_report_sends: [], listing_private_notes: [], agent_custom_domains: [],
  push_subscriptions: [], feedback: [], showing_feedback: [], booking_attempts: [], checkout_attempts: [], social_posts: [],
};
db.listings.push(
  listing(A, "published", "main-fictional-way", { photos: [photo(1), photo(2)] }),
  listing(A, "draft", "draft-lane"),
  listing(A, "pending", "pending-court"),
  listing(A, "coming_soon", "soon-circle"),
  listing(A, "closed", "sold-road"),
  listing(A, "archived", "archived-avenue"),
  listing(B, "published", "other-agent-place"),
  listing(B, "draft", "other-agent-draft"),
);
export const L = Object.fromEntries(db.listings.map((l) => [l.slug, l]));
db.leads.push({ id: crypto.randomUUID(), listing_id: L["main-fictional-way"].id, agent_id: A, name: "SECRET BUYER NAME", email: "buyer@example.invalid", phone: "", message: "SECRET TRANSCRIPT", status: "new", created_at: new Date(now - 2 * day).toISOString() });
db.showings.push({ id: crypto.randomUUID(), listing_id: L["main-fictional-way"].id, agent_id: A, status: "requested", created_at: new Date(now - day).toISOString(), showing_date: "2026-12-01", showing_time: "10:00 AM", name: "SECRET BUYER NAME", email: "buyer@example.invalid", phone: "" });
db.seller_portals.push({ id: crypto.randomUUID(), listing_id: L["main-fictional-way"].id, agent_id: A, seller_name: "Sam Seller", seller_email: "seller@example.invalid", access_token: "tok_fake_portal", active: true, visit_count: 0, last_visited_at: null, created_at: new Date(now - 5 * day).toISOString() });

export const log = { requests: [], views: [], ai: [], emails: [], vercel: [], uploads: [], external: [], writes: [] };
export const vercelState = { domains: new Map(), verified: true, misconfigured: true, addError: null };

const UNIQUE = {
  seller_report_schedules: (rows, r) => rows.some((x) => x !== r && x.listing_id === r.listing_id),
  seller_report_sends: (rows, r) => rows.some((x) => x !== r && x.schedule_id === r.schedule_id && x.period_end === r.period_end),
  agent_custom_domains: (rows, r) => r.status !== "removed" && rows.some((x) => x !== r && x.status !== "removed" && (x.hostname === r.hostname || x.agent_id === r.agent_id)),
  listing_private_notes: (rows, r) => rows.some((x) => x !== r && x.listing_id === r.listing_id),
};

function parseVal(v) { if (v === "null") return null; if (v === "true") return true; if (v === "false") return false; return v; }
function match(row, key, expr) {
  let neg = false;
  if (expr.startsWith("not.")) { neg = true; expr = expr.slice(4); }
  const i = expr.indexOf(".");
  const op = expr.slice(0, i), val = expr.slice(i + 1);
  const v = row[key];
  let r = true;
  if (op === "eq") r = String(v) === val || (val === "true" && v === true) || (val === "false" && v === false);
  else if (op === "neq") r = String(v) !== val;
  else if (op === "is") r = val === "null" ? v === null || v === undefined : String(v) === val;
  else if (op === "in") r = val.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, "")).includes(String(v));
  else if (op === "ilike") r = new RegExp("^" + val.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/[%*]/g, ".*") + "$", "i").test(String(v ?? ""));
  else if (op === "like") r = new RegExp("^" + val.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/[%*]/g, ".*") + "$").test(String(v ?? ""));
  else if (op === "gte") r = v != null && String(v) >= val;
  else if (op === "lte") r = v != null && String(v) <= val;
  else if (op === "gt") r = v != null && String(v) > val;
  else if (op === "lt") r = v != null && String(v) < val;
  return neg ? !r : r;
}
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS", "access-control-expose-headers": "content-range" };
const send = (res, status, body, headers = {}) => { res.writeHead(status, { "content-type": "application/json", ...CORS, ...headers }); res.end(body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body)); };
function project(r, sel) {
  if (!sel || sel.trim() === "*") return r;
  const out = {};
  for (const c of sel.split(",").map((s) => s.trim()).filter(Boolean)) { const name = c.split(":").pop().split("(")[0]; out[name] = r[name] ?? null; }
  return out;
}
const userFrom = (req) => TOKENS[(req.headers.authorization || "").replace(/^Bearer /, "")] || null;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);
  const body = raw.toString();
  log.requests.push(`${req.method} ${url.pathname}`);
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }

  if (url.pathname === "/__log") return send(res, 200, log);
  if (url.pathname === "/__db") return send(res, 200, db[url.searchParams.get("t")] || []);
  if (url.pathname === "/__control") {
    const j = JSON.parse(body || "{}");
    if (j.vercel) Object.assign(vercelState, j.vercel);
    if (j.patch) { const row = db[j.patch.table].find((r) => r.id === j.patch.id); Object.assign(row, j.patch.values); }
    return send(res, 200, { ok: true });
  }
  // ---- Anthropic
  if (url.pathname === "/v1/messages") { const p = JSON.parse(body); log.ai.push({ system: p.system }); return send(res, 200, { id: "msg", type: "message", role: "assistant", model: p.model, content: [{ type: "text", text: "FAKE_REPLY from the local mock." }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } }); }
  // ---- Resend
  if (url.pathname === "/resend/emails") { const p = JSON.parse(body); log.emails.push({ to: p.to, subject: p.subject, idem: req.headers["idempotency-key"], html: p.html }); return send(res, 200, { id: `re_${log.emails.length}` }); }
  // ---- Vercel
  if (url.pathname.startsWith("/vercel/")) {
    const p = url.pathname.slice("/vercel".length);
    log.vercel.push(`${req.method} ${p}`);
    let m;
    if (req.method === "POST" && /^\/v10\/projects\/[^/]+\/domains$/.test(p)) {
      if (vercelState.addError) return send(res, vercelState.addError.status, { error: { code: vercelState.addError.code } });
      const name = JSON.parse(body).name; vercelState.domains.set(name, true); return send(res, 200, { name });
    }
    if ((m = p.match(/^\/v9\/projects\/[^/]+\/domains\/([^/]+)$/))) {
      const name = decodeURIComponent(m[1]);
      if (req.method === "DELETE") { vercelState.domains.delete(name); return send(res, 204); }
      if (!vercelState.domains.has(name)) return send(res, 404, { error: { code: "not_found" } });
      return send(res, 200, { name, apexName: name.split(".").slice(-2).join("."), verified: vercelState.verified, verification: vercelState.verified ? [] : [{ type: "TXT", domain: `_vercel.${name.split(".").slice(-2).join(".")}`, value: "vc-domain-verify=fake123", reason: "pending_domain_verification" }] });
    }
    if ((m = p.match(/^\/v9\/projects\/[^/]+\/domains\/([^/]+)\/verify$/))) return send(res, vercelState.verified ? 200 : 400, { verified: vercelState.verified });
    if ((m = p.match(/^\/v6\/domains\/([^/]+)\/config$/))) return send(res, 200, { misconfigured: vercelState.misconfigured, recommendedCNAME: [{ rank: 1, value: "cname.mock-provider.invalid." }], recommendedIPv4: [{ rank: 1, value: ["192.0.2.10"] }] });
    return send(res, 404, {});
  }
  // ---- auth
  if (url.pathname === "/auth/v1/user") {
    const u = userFrom(req);
    if (!u) return send(res, 401, { message: "invalid" });
    return send(res, 200, { id: u, aud: "authenticated", role: "authenticated", email: `agent${u.slice(-2)}@example.invalid`, app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" });
  }
  if (url.pathname.startsWith("/auth/v1/")) return send(res, 200, {});
  // ---- storage
  if (url.pathname.startsWith("/storage/v1/object/public/")) {
    const key = url.pathname.slice("/storage/v1/object/public/".length);
    const f = storage.get(key);
    if (!f) return send(res, 404, { message: "not found" });
    res.writeHead(200, { "content-type": f.type, "access-control-allow-origin": "*" }); return res.end(f.body);
  }
  if (url.pathname.startsWith("/storage/v1/object/") && (req.method === "POST" || req.method === "PUT")) {
    const key = url.pathname.slice("/storage/v1/object/".length);
    const u = userFrom(req);
    const [bucket, folder] = key.split("/");
    if (!u || bucket !== "listing-photos" || folder !== u) return send(res, 403, { message: "Unauthorized folder" });
    storage.set(key, { type: req.headers["content-type"] || "application/octet-stream", body: raw });
    log.uploads.push(key);
    return send(res, 200, { Key: key });
  }
  // ---- rpc
  if (url.pathname === "/rest/v1/rpc/increment_view_count") { log.views.push(JSON.parse(body || "{}").listing_id); return send(res, 204); }
  if (url.pathname === "/rest/v1/rpc/resolve_custom_domain") {
    const host = String(JSON.parse(body || "{}").p_host || "").toLowerCase();
    const d = db.agent_custom_domains.find((x) => x.hostname === host && x.status === "connected");
    const a = d && db.agent_profiles.find((x) => x.id === d.agent_id);
    return send(res, 200, d ? [{ agent_id: d.agent_id, handle: a?.handle ?? null }] : []);
  }
  // ---- PostgREST tables
  const m = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
  if (m) {
    const t = m[1];
    if (!db[t]) db[t] = [];
    const table = db[t];
    const filt = (rows) => {
      let out = rows;
      for (const [k, v] of url.searchParams) {
        if (["select", "order", "limit", "offset", "columns", "on_conflict", "or", "and"].includes(k)) continue;
        out = out.filter((r) => match(r, k, v));
      }
      return out;
    };
    const sel = url.searchParams.get("select");
    const single = (req.headers.accept || "").includes("vnd.pgrst.object");
    const prefer = req.headers.prefer || "";
    const respond = (rows) => {
      const out = rows.map((r) => project(r, sel));
      if (single) { if (out.length !== 1) return send(res, 406, { code: "PGRST116", message: "0 or many rows", details: null, hint: null }); return send(res, 200, out[0]); }
      return send(res, 200, out, { "content-range": `0-${Math.max(0, out.length - 1)}/${out.length}` });
    };
    if (req.method === "GET" || req.method === "HEAD") {
      let rows = filt(table);
      const order = url.searchParams.get("order");
      if (order) { const [col, dir] = order.split(",")[0].split("."); rows = [...rows].sort((a, b) => (String(a[col] ?? "") < String(b[col] ?? "") ? -1 : 1) * (dir === "desc" ? -1 : 1)); }
      const limit = Number(url.searchParams.get("limit"));
      if (limit) rows = rows.slice(0, limit);
      if (req.method === "HEAD") return send(res, 200, undefined, { "content-range": `0-0/${rows.length}` });
      return respond(rows);
    }
    const user = userFrom(req);
    const isService = (req.headers.apikey || "") === "fake-service";
    const ownerCol = t === "agent_profiles" ? "id" : "agent_id";
    // RLS stand-in for browser writes: own rows only, and listings/private notes must belong to the user.
    const allowed = (r) => isService || (user && r[ownerCol] === user);
    if (req.method === "POST") {
      const items = [].concat(JSON.parse(body || "[]"));
      const upsert = /resolution=merge-duplicates/.test(prefer);
      const out = [];
      for (const it of items) {
        if (!allowed(it)) return send(res, 403, { code: "42501", message: "new row violates row-level security policy" });
        if (t === "listing_private_notes" && !isService && db.listings.find((l) => l.id === it.listing_id)?.agent_id !== user) return send(res, 403, { code: "42501", message: "rls" });
        const conflictKey = url.searchParams.get("on_conflict");
        let existing = upsert && conflictKey ? table.find((r) => conflictKey.split(",").every((k) => r[k] === it[k])) : null;
        if (!existing && upsert && t === "listing_private_notes") existing = table.find((r) => r.listing_id === it.listing_id);
        if (existing) { Object.assign(existing, it); out.push(existing); continue; }
        const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...(t === "seller_report_sends" ? { attempts: 1, claimed_at: new Date().toISOString() } : {}), ...(t === "agent_custom_domains" ? { dns_records: [], check_count: 0, last_error: null, last_checked_at: null, connected_at: null } : {}), ...it };
        if (UNIQUE[t] && UNIQUE[t]([...table, row], row)) return send(res, 409, { code: "23505", message: "duplicate key value violates unique constraint", details: null, hint: null });
        table.push(row); out.push(row);
      }
      log.writes.push(`POST ${t}`);
      return /return=representation/.test(prefer) ? respond(out) : send(res, 201, "");
    }
    if (req.method === "PATCH") {
      const patch = JSON.parse(body || "{}");
      const rows = filt(table).filter(allowed);
      for (const r of rows) {
        const before = { ...r };
        Object.assign(r, patch);
        if (UNIQUE[t] && UNIQUE[t](table, r)) { Object.assign(r, before); return send(res, 409, { code: "23505", message: "duplicate" }); }
      }
      log.writes.push(`PATCH ${t} ${Object.keys(patch).join(",")} rows=${rows.length}`);
      return /return=representation/.test(prefer) ? respond(rows) : send(res, 204);
    }
    if (req.method === "DELETE") {
      const rows = filt(table).filter(allowed);
      db[t] = table.filter((r) => !rows.includes(r));
      log.writes.push(`DELETE ${t} rows=${rows.length}`);
      return /return=representation/.test(prefer) ? respond(rows) : send(res, 204);
    }
  }
  if (url.pathname.startsWith("/realtime/")) return send(res, 404, {});
  log.external.push(`${req.method} ${req.url}`);
  send(res, 404, { message: "unhandled in fake" });
});

server.listen(54321, "127.0.0.1", () => console.log("fake2 ready on 127.0.0.1:54321"));
