import type { Lead } from "./types";

// Rules-based hot lead scoring — no AI call needed
// Score 0-100 mapped to 🔥 Hot (70+), 🟡 Warm (30-69), ⚪ Cold (<30)

export interface HotScoreInputs {
  lead: Pick<Lead, "status" | "phone" | "message" | "created_at" | "auto_reply_draft" | "first_response_at" | "is_read">;
  messageCount?: number;
  visitCount?: number;
  hasShowing?: boolean;
}

export type HotTier = "hot" | "warm" | "cold";

export function calculateHotScore(inputs: HotScoreInputs): { score: number; tier: HotTier; reasons: string[] } {
  const { lead, messageCount = 0, visitCount = 0, hasShowing = false } = inputs;
  let score = 0;
  const reasons: string[] = [];

  // Phone number provided = strong signal
  if (lead.phone && lead.phone.trim().length >= 10) {
    score += 15;
    reasons.push("Left phone number");
  }

  // Wrote a substantive message (not generic)
  if (lead.message && lead.message.length > 30) {
    score += 15;
    reasons.push("Detailed inquiry");
  }

  // Status signals
  if (lead.status === "showing_scheduled" || hasShowing) {
    score += 30;
    reasons.push("Booked a showing");
  } else if (lead.status === "contacted") {
    score += 10;
  } else if (lead.status === "offer_made" || lead.status === "under_contract") {
    score += 40;
    reasons.push("Active deal");
  }

  // Repeat visits = high interest
  if (visitCount >= 5) {
    score += 25;
    reasons.push(`Viewed ${visitCount}× times`);
  } else if (visitCount >= 3) {
    score += 15;
    reasons.push(`Viewed ${visitCount}× times`);
  } else if (visitCount >= 2) {
    score += 8;
  }

  // Active conversation (multiple messages)
  if (messageCount >= 3) {
    score += 15;
    reasons.push("Active conversation");
  } else if (messageCount >= 1) {
    score += 5;
  }

  // Recency — drop score for cold leads
  const ageHours = (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60);
  if (ageHours < 24) {
    score += 10;
    if (ageHours < 1) reasons.push("Just inquired");
  } else if (ageHours > 168 && messageCount === 0) {
    // older than a week with no conversation
    score -= 15;
  }

  score = Math.max(0, Math.min(100, score));

  const tier: HotTier = score >= 70 ? "hot" : score >= 30 ? "warm" : "cold";

  return { score, tier, reasons };
}
