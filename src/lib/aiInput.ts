// Server-side input limits for the AI routes.
//
// WHAT THIS IS: a per-request bound on how much text and how many images one call can send to the model.
// WHAT THIS IS NOT: a spending cap. Each call is still bounded by the route's rate limit and output cap,
// and nothing here limits how many calls an account makes over time or total spend.
//
// Behaviour: excessive input is REJECTED with a clear message (never silently truncated), before any model
// call is made. Lengths count Unicode code points (so an emoji or a Chinese character counts as 1, not 2),
// and the whole request body is also bounded in bytes (UTF-8), so multi-byte text cannot sneak past.
//
// How the numbers were chosen (from the real fields and normal use):
//   - street / city / state / zip / agent name / lot size: real values are well under 100 characters.
//   - numeric fields (price, beds, baths, sqft, year): short strings or numbers; 24 characters is generous.
//   - listing description / agent's starting text: MLS descriptions are typically 1,000 to 4,000 characters;
//     6,000 leaves room for long luxury descriptions.
//   - feature lists: one feature per line, rarely above 40 lines of under 100 characters.
//   - assistant question: a chat message; 2,000 characters. Earlier turns: the last 8, up to 4,000 each
//     (a model answer can be about 1,000 tokens).
//   - photos per caption request: the form uploads in batches; 25 per call (callers send more in several calls).
//   - whole request: 64 KB covers every legitimate combination above with room to spare.

export const AI_INPUT_LIMITS = {
  requestBytes: 64 * 1024,
  shortText: 120,
  numberField: 24,
  existingText: 6_000,
  description: 6_000,
  featureItems: 50,
  featureItemChars: 120,
  chatMessage: 2_000,
  historyMessages: 8,
  historyMessageChars: 4_000,
  photoUrls: 25,
  url: 2_048,
} as const;

export interface AiInputError {
  status: number;
  error: string;
  code: "request_too_large" | "input_too_long" | "invalid_input";
  field?: string;
  max?: number;
}
export type Checked<T> = { ok: true; value: T } | ({ ok: false } & AiInputError);

const nf = (n: number) => n.toLocaleString("en-US");
export const codePoints = (s: string): number => Array.from(s).length;
const utf8Bytes = (s: string): number => new TextEncoder().encode(s).length;

// Reads and parses the JSON body, refusing anything over the byte limit before parsing it.
export async function readLimitedJson(req: Request, maxBytes: number = AI_INPUT_LIMITS.requestBytes): Promise<Checked<unknown>> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, status: 413, code: "request_too_large", error: `That request is too large (limit ${nf(Math.round(maxBytes / 1024))} KB). Shorten the text and try again.`, max: maxBytes };
  }
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, status: 400, code: "invalid_input", error: "Invalid request" };
  }
  if (utf8Bytes(text) > maxBytes) {
    return { ok: false, status: 413, code: "request_too_large", error: `That request is too large (limit ${nf(Math.round(maxBytes / 1024))} KB). Shorten the text and try again.`, max: maxBytes };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, code: "invalid_input", error: "Invalid request" };
  }
}

const NAMES: Record<string, string> = {
  existing: "Your starting text", street: "Street address", city: "City", state: "State", zip: "ZIP code", lotSize: "Lot size",
  price: "Price", beds: "Bedrooms", baths: "Bathrooms", sqft: "Square feet", yearBuilt: "Year built", message: "Your question",
  "earlier message": "An earlier message", feature: "A feature", agentName: "Agent name", publicUrl: "Listing link", description: "Description",
  property: "Property details", type: "Request type", photoUrls: "Photos",
};
const label = (field: string) => NAMES[field] || "That field";

// Optional text field: must be a string (or absent) and within the limit.
function text(field: string, v: unknown, max: number): AiInputError | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") return { status: 400, code: "invalid_input", error: `${label(field)} must be text.`, field };
  const n = codePoints(v);
  if (n > max) return { status: 422, code: "input_too_long", error: `${label(field)} is too long (${nf(n)} of ${nf(max)} characters). Shorten it and try again.`, field, max };
  return null;
}
// Optional number-like field: a number or a short string.
function numeric(field: string, v: unknown): AiInputError | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? null : { status: 400, code: "invalid_input", error: `${label(field)} must be a number.`, field };
  return text(field, v, AI_INPUT_LIMITS.numberField);
}
const first = (...errs: Array<AiInputError | null>): AiInputError | null => errs.find((e) => e) || null;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const bad = (error: string, field?: string): AiInputError => ({ status: 400, code: "invalid_input", error, field });

function propertyErrors(p: unknown, requireObject: boolean): AiInputError | null {
  if (!isObj(p)) return requireObject ? bad("Missing property data", "property") : null;
  const L = AI_INPUT_LIMITS;
  return first(
    text("street", p.street, L.shortText), text("city", p.city, L.shortText), text("state", p.state, L.shortText),
    text("zip", p.zip, L.shortText), text("lotSize", p.lotSize, L.shortText),
    numeric("price", p.price), numeric("beds", p.beds), numeric("baths", p.baths), numeric("sqft", p.sqft), numeric("yearBuilt", p.yearBuilt)
  );
}

export function checkGenerate(body: unknown): AiInputError | null {
  if (!isObj(body)) return bad("Invalid request");
  if (typeof body.type !== "string") return bad("Missing type or property data", "type");
  return first(propertyErrors(body.property, true), text("existing", body.existing, AI_INPUT_LIMITS.existingText));
}

export function checkCaption(body: unknown): AiInputError | null {
  if (!isObj(body)) return bad("Invalid request");
  const urls = body.photoUrls;
  if (!Array.isArray(urls) || urls.length === 0) return bad("Missing photoUrls array", "photoUrls");
  if (urls.length > AI_INPUT_LIMITS.photoUrls) {
    return { status: 422, code: "input_too_long", error: `Too many photos in one request (${urls.length} of ${AI_INPUT_LIMITS.photoUrls}). Captions are generated ${AI_INPUT_LIMITS.photoUrls} at a time.`, field: "photoUrls", max: AI_INPUT_LIMITS.photoUrls };
  }
  for (const u of urls) {
    if (typeof u !== "string" || !/^https:\/\//i.test(u)) return bad("Each photo must be an https link.", "photoUrls");
    if (codePoints(u) > AI_INPUT_LIMITS.url) return { status: 422, code: "input_too_long", error: `A photo link is too long (limit ${nf(AI_INPUT_LIMITS.url)} characters).`, field: "photoUrls", max: AI_INPUT_LIMITS.url };
  }
  return propertyErrors(body.property, false);
}

export function checkAssistant(body: unknown): AiInputError | null {
  if (!isObj(body)) return bad("Invalid request");
  if (typeof body.message !== "string" || !body.message.trim()) return bad("Missing message", "message");
  const m = text("message", body.message, AI_INPUT_LIMITS.chatMessage);
  if (m) return m;
  if (body.history === undefined || body.history === null) return null;
  if (!Array.isArray(body.history)) return bad("History must be a list.", "history");
  if (body.history.length > AI_INPUT_LIMITS.historyMessages * 4) return bad("Too many earlier messages.", "history");
  for (const h of body.history.slice(-AI_INPUT_LIMITS.historyMessages)) {
    if (!isObj(h)) return bad("Invalid earlier message.", "history");
    const e = text("earlier message", h.text, AI_INPUT_LIMITS.historyMessageChars);
    if (e) return { ...e, field: "history" };
    if (h.text !== undefined && typeof h.text !== "string") return bad("Invalid earlier message.", "history");
  }
  return null;
}

export function checkSocialCaption(body: unknown): AiInputError | null {
  if (!isObj(body)) return bad("Invalid request");
  const L = AI_INPUT_LIMITS;
  const feats = body.features;
  if (feats !== undefined && feats !== null) {
    if (!Array.isArray(feats)) return bad("Features must be a list.", "features");
    if (feats.length > L.featureItems) return { status: 422, code: "input_too_long", error: `Too many features (${feats.length} of ${L.featureItems}).`, field: "features", max: L.featureItems };
    for (const f of feats) { const e = text("feature", f, L.featureItemChars); if (e) return { ...e, field: "features" }; }
  }
  return first(
    text("street", body.street, L.shortText), text("city", body.city, L.shortText), text("state", body.state, L.shortText),
    text("agentName", body.agentName, L.shortText), text("publicUrl", body.publicUrl, L.url), text("price", body.price, L.numberField),
    numeric("beds", body.beds), numeric("baths", body.baths), numeric("sqft", body.sqft),
    text("description", body.description, L.description)
  );
}

// Convenience for routes: reads + validates in one step.
export async function readAiInput(req: Request, check: (b: unknown) => AiInputError | null): Promise<Checked<Record<string, unknown>>> {
  const raw = await readLimitedJson(req);
  if (!raw.ok) return raw;
  const err = check(raw.value);
  if (err) return { ok: false, ...err };
  return { ok: true, value: raw.value as Record<string, unknown> };
}

// The response a route returns for a rejected input. The model has not been called.
export function inputErrorResponse(e: AiInputError): Response {
  return new Response(JSON.stringify({ error: e.error, code: e.code, field: e.field, max: e.max }), {
    status: e.status,
    headers: { "Content-Type": "application/json" },
  });
}
