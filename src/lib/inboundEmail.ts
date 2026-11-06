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

  // 4. The sender must be that lead's own email address (a stranger who learns a lead id cannot add to its thread).
  const sender = bareAddress(data.from);
  if (!sender || !lead.email || sender !== lead.email.trim().toLowerCase()) {
    deps.log("Inbound email sender does not match the lead; dropped", { emailId });
    return { status: 200, body: { ok: true, matched: false } };
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
  // The provider's verdicts are RECORDED, not enforced: what pass means for From-domain alignment is not documented and
  // has not been observed on a real delivery. Until then the sender check above is NOT proof of authenticity.
  deps.log("Inbound email authentication verdicts (provider-computed)", { emailId, authentication: full.authentication ?? null });
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
