// The buyer-chat request, with every outside dependency passed in so it can be tested with fakes.
// The API route (app/api/ai/chat/route.ts) supplies the real Supabase reads and model call.
import { buildChatSystemPrompt, buildListingAiContext, chatAccess, type AiAgent, type AiListingRow } from "./listingAiContext";
import { isAgentInactive } from "./listingVisibility";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatDeps {
  loadListing: (id: string) => Promise<(AiListingRow & { agent_id: string }) | null>;
  loadAgent: (agentId: string) => Promise<(AiAgent & { subscription_status?: string | null; trial_ends_at?: string | null }) | null>;
  // id of the signed-in user, or null for anonymous visitors
  getUserId: () => Promise<string | null>;
  callModel: (system: string, messages: ChatTurn[]) => Promise<string>;
  // fixed context for the public demo page (no database row)
  demo?: { row: AiListingRow; agent: AiAgent };
}

export interface ChatBody {
  message?: unknown;
  listingId?: unknown;
  history?: unknown;
}

export type ChatResult =
  | { status: 200; body: { reply: string; testMode: boolean } }
  | { status: number; body: { error: string } };

const FALLBACK_REPLY = "I don't have an answer for that right now. The listing agent can help directly; their contact details are on this page.";

export function cleanHistory(history: unknown): ChatTurn[] {
  if (!Array.isArray(history)) return [];
  const out: ChatTurn[] = [];
  for (const m of history.slice(-8)) {
    const text = m && typeof m === "object" ? (m as { text?: unknown }).text : undefined;
    if (typeof text !== "string" || !text.trim()) continue;
    out.push({ role: (m as { role?: unknown }).role === "user" ? "user" : "assistant", content: text.slice(0, 1500) });
  }
  // The model API expects the conversation to start with a user turn.
  while (out.length > 0 && out[0].role !== "user") out.shift();
  return out;
}

export async function runChat(body: ChatBody, deps: ChatDeps): Promise<ChatResult> {
  const { message, listingId } = body;
  if (typeof message !== "string" || !message.trim()) return { status: 400, body: { error: "Missing message" } };
  if (message.length > 2000) return { status: 400, body: { error: "Message too long" } };
  if (typeof listingId !== "string" || !listingId || listingId.length > 100) {
    return { status: 400, body: { error: "Missing listing" } };
  }

  let row: AiListingRow;
  let agent: AiAgent;
  let testMode = false;

  if (listingId === "demo") {
    if (!deps.demo) return { status: 404, body: { error: "Listing not found" } };
    row = deps.demo.row;
    agent = deps.demo.agent;
  } else {
    const listing = await deps.loadListing(listingId);
    if (!listing) return { status: 404, body: { error: "Listing not found" } };
    const [agentRow, userId] = await Promise.all([deps.loadAgent(listing.agent_id), deps.getUserId()]);
    if (!agentRow) return { status: 404, body: { error: "Listing not found" } };
    const access = chatAccess({
      status: listing.status,
      aiChatEnabled: listing.ai_chat_enabled,
      agentInactive: isAgentInactive(agentRow),
      isOwner: !!userId && userId === listing.agent_id,
    });
    if (!access.ok) return { status: access.status, body: { error: access.error } };
    row = listing;
    agent = agentRow;
    testMode = access.testMode;
  }

  const system = buildChatSystemPrompt({ context: buildListingAiContext(row), agent, testMode });
  const messages = [...cleanHistory(body.history), { role: "user" as const, content: message.trim() }];
  const reply = (await deps.callModel(system, messages)).trim();
  return { status: 200, body: { reply: reply || FALLBACK_REPLY, testMode } };
}
