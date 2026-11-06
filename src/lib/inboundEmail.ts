// Orchestration for POST /api/messages/inbound (buyer replies received by Resend), with every
// provider and database call injected. The route builds the real dependencies; tests use fakes.
//
// What Resend actually sends (official docs: Receiving > webhooks):
//   - the request is SIGNED (svix-id / svix-timestamp / svix-signature) over the RAW body; there is no
//     static-header option, so the signature MUST be verified against the unparsed text of the request
//   - an `email.received` event carries only metadata (email_id, from, to, received_for, message_id,
//     subject). The body is NOT included: it is fetched with the Received emails API.
//
// Routing and isolation: a reply is attributed to a lead ONLY by the address it was sent to,
// `reply+<lead id>@<INBOUND_REPLY_DOMAIN>`, and only when the sender is that lead's own email address.
// There is no "latest lead with this email" fallback: that could attach a buyer's mail to another
// agent's lead. Anything that cannot be attributed safely is accepted (so Resend does not retry) and dropped.

export const INBOUND_EVENT = "email.received";

// ---- Acceptance policy for a received reply -------------------------------------------------------------------------
// A reply is added to a lead's thread only if the provider's documented verdicts say DKIM passed and DMARC is pass or
// gray (Resend: gray = SPF or DKIM passed but the sender's domain has no DMARC policy or uses p=none). SPF alone is not
// enough. This is a filter on documented verdict VALUES: it is not a proof that the displayed sender is authentic, and it
// does not rely on how Resend decides "pass". There is NO switch that turns it off: it applies whether or not customer
// reply routing is on, so routing can never run without it.
//
// A reply that is not accepted is never added to the thread. The app does NOT retain a rejected message: what it keeps is a
// review marker (a fixed tag, no content from the message) and the unread flag on the lead. Whether the provider still holds
// the received message, and for how long, is not established here, so nothing is promised about recovering it. A failed or
// missing verdict is NOT treated as evidence of bad intent: forwarding, mailing lists and unsigned domains all produce them.
export const REVIEW_TAG = "reply_needs_review";

export type AuthVerdicts = { spf: string | null; dkim: string | null; dmarc: string | null };
export interface AuthDecision {
  accepted: boolean;
  reason: "passed" | "missing" | "dkim_not_pass" | "dmarc_not_acceptable";
  verdicts: AuthVerdicts;
}
export type ReviewReason = "authentication_not_verified" | "sender_differs";

// Only short strings are ever kept (they are logged); anything else counts as "no verdict".
const verdictOf = (v: unknown): string | null => (typeof v === "string" ? v.slice(0, 24) : null);

export function evaluateAuthentication(a: { spf?: unknown; dkim?: unknown; dmarc?: unknown } | null | undefined): AuthDecision {
  const verdicts: AuthVerdicts = { spf: verdictOf(a?.spf), dkim: verdictOf(a?.dkim), dmarc: verdictOf(a?.dmarc) };
  if (!a || typeof a !== "object") return { accepted: false, reason: "missing", verdicts };
  if (verdicts.dkim !== "pass") return { accepted: false, reason: "dkim_not_pass", verdicts };
  if (verdicts.dmarc !== "pass" && verdicts.dmarc !== "gray") return { accepted: false, reason: "dmarc_not_acceptable", verdicts };
  return { accepted: true, reason: "passed", verdicts };
}

// The tags to write so the lead shows the review marker, or null when it is already there (nothing to write).
export function withReviewTag(tags: string[] | null | undefined): string[] | null {
  const current = Array.isArray(tags) ? tags : [];
  return current.includes(REVIEW_TAG) ? null : [REVIEW_TAG, ...current];
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// Where outbound mail asks buyers to reply. DEFAULT OFF: replies go straight to the agent's own address and nothing
// flows through the inbox webhook. Routing turns on only when ALL of these hold, so a half-finished setup can never
// send buyers' replies to an address the webhook cannot accept:
//   INBOUND_REPLY_ROUTING is exactly "1" (the explicit final switch, set last), a valid INBOUND_REPLY_DOMAIN,
//   RESEND_WEBHOOK_SECRET and RESEND_API_KEY. (INBOUND_REPLY_DOMAIN alone only lets the webhook recognise addresses.)
// What this cannot see: whether the domain's receiving DNS is actually verified. That is checked by hand first.
export function replyToFor(
  agentEmail: string,
  leadId: string,
  env: Record<string, string | undefined> = process.env
): string {
  if (env.INBOUND_REPLY_ROUTING !== "1") return agentEmail;
  if (!env.RESEND_WEBHOOK_SECRET || !env.RESEND_API_KEY) return agentEmail;
  const domain = (env.INBOUND_REPLY_DOMAIN || "").trim().toLowerCase();
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return agentEmail;
  if (!new RegExp(`^${UUID}$`, "i").test(leadId)) return agentEmail;
  return `reply+${leadId.toLowerCase()}@${domain}`;
}

// The lead id encoded in any of the recipient addresses, for the configured domain only.
export function leadIdFromRecipients(
  recipients: Array<string | null | undefined>,
  env: Record<string, string | undefined> = process.env
): string | null {
  const domain = (env.INBOUND_REPLY_DOMAIN || "").trim().toLowerCase();
  if (!domain) return null;
  const escaped = domain.replace(/\./g, "\\.");
  const re = new RegExp(`(?:^|[<\\s])reply\\+(${UUID})@${escaped}(?:$|[>\\s])`, "i");
  for (const r of recipients) {
    const m = re.exec(String(r || "").trim());
    if (m) return m[1].toLowerCase();
  }
  return null;
}

export interface ReceivedEventData {
  email_id?: string;
  from?: string;
  to?: string[];
  received_for?: string[];
  message_id?: string;
  subject?: string;
}

export interface ReceivedEmail {
  text?: string | null;
  html?: string | null;
  subject?: string | null;
  from?: string | null;
  // SPF / DKIM / DMARC verdicts computed by the receiving mail server (Resend docs: flat strings such as pass, fail, gray).
  authentication?: { spf?: string | null; dkim?: string | null; dmarc?: string | null } | null;
}

export interface InboundLead {
  id: string;
  agent_id: string;
  email: string | null;
  status: string | null;
  tags?: string[] | null;
}

export interface InboundDeps {
  webhookSecretConfigured: () => boolean;
  // Throws when the signature, timestamp or id header is missing or wrong.
  verify: (input: { payload: string; headers: { id: string; timestamp: string; signature: string } }) => { type?: string; data?: ReceivedEventData };
  fetchReceived: (emailId: string) => Promise<ReceivedEmail | null>;
  getLead: (leadId: string) => Promise<InboundLead | null>;
  messageExists: (providerMessageId: string) => Promise<boolean>;
  insertMessage: (row: { lead_id: string; agent_id: string; subject: string; body: string; provider_message_id: string | null }) => Promise<boolean>;
  markLeadUnread: (lead: InboundLead) => Promise<void>;
  // Flags the lead for review (REVIEW_TAG + unread). Idempotent. Must throw if it cannot record the marker.
  markNeedsReview: (lead: InboundLead, reason: ReviewReason) => Promise<void>;
  env?: Record<string, string | undefined>;
  log: (message: string, detail?: unknown) => void;
}

export interface InboundOutcome {
  status: number;
  body: Record<string, unknown>;
}

function bareAddress(value: string | null | undefined): string {
  const s = String(value || "").trim();
  const m = /<([^>]+)>/.exec(s);
  return (m ? m[1] : s).trim().toLowerCase();
}

export async function processInboundEmail(
  rawBody: string,
  headers: { get(name: string): string | null },
  deps: InboundDeps
): Promise<InboundOutcome> {
  // 1. Fail closed: no secret configured, or no valid signature over the raw body, means no access.
  if (!deps.webhookSecretConfigured()) return { status: 500, body: { error: "Webhook not configured" } };
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");
  if (!id || !timestamp || !signature) return { status: 400, body: { error: "Missing signature headers" } };

  let event: { type?: string; data?: ReceivedEventData };
  try {
    event = deps.verify({ payload: rawBody, headers: { id, timestamp, signature } });
  } catch {
    return { status: 400, body: { error: "Invalid webhook" } };
  }

  // 2. Only the one event this endpoint is registered for.
  const emailId = event.data?.email_id;
  if (event.type !== INBOUND_EVENT || !event.data || !emailId) return { status: 200, body: { ok: true, ignored: true } };
  const data = event.data;
  const env = deps.env ?? process.env;

  // 3. Attribute by recipient address; drop anything that cannot be attributed safely.
  const leadId = leadIdFromRecipients([...(data.received_for || []), ...(data.to || [])], env);
  if (!leadId) {
    deps.log("Inbound email not addressed to a lead reply address; dropped", { emailId });
    return { status: 200, body: { ok: true, matched: false } };
  }
  const lead = await deps.getLead(leadId);
  if (!lead) return { status: 200, body: { ok: true, matched: false } };

  // A reply that cannot be added to the thread is NOT retained: only the review marker is recorded. Nothing from the message
  // is stored or logged. If the marker cannot be recorded the answer is 500, so the provider may retry (its retry schedule
  // is finite, so this is not a guarantee that the marker is eventually recorded).
  const hold = async (reason: ReviewReason): Promise<InboundOutcome> => {
    try {
      await deps.markNeedsReview(lead, reason);
    } catch {
      deps.log("Could not record the review marker", { emailId, leadId: lead.id });
      return { status: 500, body: { error: "Could not record the review marker" } };
    }
    return { status: 200, body: { ok: true, matched: true, stored: false, held_for_review: true } };
  };

  // 4. Only the lead's own address may add to its thread. A different sender is not assumed to be hostile (a lead may
  //    write from another mailbox): the reply is held for review without being stored.
  const sender = bareAddress(data.from);
  if (!sender || !lead.email || sender !== lead.email.trim().toLowerCase()) {
    deps.log("Inbound email held for review: sender differs from the lead", { emailId, leadId: lead.id });
    return hold("sender_differs");
  }

  // 5. Retries repeat the same event: store each received message once.
  const providerId = data.message_id || emailId;
  if (await deps.messageExists(providerId)) return { status: 200, body: { ok: true, duplicate: true } };

  // 6. The webhook has no body: fetch it. A failure here is a 500 so Resend retries on its schedule.
  let full: ReceivedEmail | null = null;
  try {
    full = await deps.fetchReceived(emailId);
  } catch (err) {
    deps.log("Fetching the received email failed", err);
  }
  if (!full) return { status: 500, body: { error: "Could not fetch the received email" } };
  // 7. Acceptance policy (see the top of this file). The verdicts are logged (short strings only) as evidence.
  const decision = evaluateAuthentication(full.authentication);
  deps.log("Inbound email authentication", { emailId, ...decision.verdicts, decision: decision.reason });
  if (!decision.accepted) return hold("authentication_not_verified");

  const body = (full.text && full.text.trim()) || (full.html && full.html.trim()) || "";
  if (!body) return { status: 200, body: { ok: true, matched: true, empty: true } };

  const stored = await deps.insertMessage({
    lead_id: lead.id,
    agent_id: lead.agent_id,
    subject: String(full.subject ?? data.subject ?? ""),
    body,
    provider_message_id: providerId,
  });
  if (!stored) return { status: 500, body: { error: "Could not save the message" } };

  await deps.markLeadUnread(lead);
  return { status: 200, body: { ok: true, matched: true } };
}
