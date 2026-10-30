import { NextRequest, NextResponse } from "next/server";
import { internalHeaders } from "@/lib/internalAuth";
import { createClient } from "@supabase/supabase-js";
import { formatPhone } from "@/lib/formatters";
import {
  createCalendarEvent,
  refreshAccessToken,
  isGoogleConfigured,
} from "@/lib/google/oauth";
import { checkHoneypotAndTiming, checkRateLimits } from "@/lib/antiSpam";
import { sendPushToAgent } from "@/lib/sendPush";
import {
  BOOKING_LIMITS,
  processBookingRequest,
  type BookingDeps,
  type BookingStore,
} from "@/lib/showingBooking";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// All the decisions (validation, rate limiting, ordering) live in
// src/lib/showingBooking.ts and are tested with fake dependencies. This file only
// connects them to the real database and providers.
function buildStore(db: ReturnType<typeof getAdminClient>): BookingStore {
  return {
    async findListing(listingId) {
      const { data } = await db
        .from("listings")
        .select("id, agent_id")
        .eq("id", listingId)
        .maybeSingle();
      return data ? { id: data.id, agent_id: data.agent_id } : null;
    },
    async legacyLeadRateLimit(listingId, email) {
      const r = await checkRateLimits(db, { listingId, email });
      return r.ok ? { ok: true } : { ok: false, reason: r.reason || "Too many submissions." };
    },
    async reserveBookingAttempt(listingId, email) {
      const { data, error } = await db.rpc("reserve_booking_attempt", {
        p_listing_id: listingId,
        p_email: email,
        p_window_minutes: BOOKING_LIMITS.windowMinutes,
        p_per_email_listing: BOOKING_LIMITS.perEmailPerListing,
        p_per_email_all: BOOKING_LIMITS.perEmailAllListings,
        p_per_listing: BOOKING_LIMITS.perListing,
      });
      if (error) {
        console.error("Booking limiter unavailable:", error);
        return "unavailable";
      }
      return data === true ? "reserved" : "limited";
    },
    async findLeadId(listingId, email) {
      const { data } = await db
        .from("leads")
        .select("id")
        .eq("listing_id", listingId)
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.id ?? null;
    },
    async insertLead(row) {
      const { data } = await db.from("leads").insert(row).select("id").single();
      return data?.id ?? null;
    },
    async updateLead(leadId, fields) {
      await db.from("leads").update(fields).eq("id", leadId);
    },
    async insertShowing(row) {
      const { data, error } = await db.from("showings").insert(row).select("id").single();
      if (error || !data) {
        console.error("Showing insert error:", error);
        return null;
      }
      return { id: data.id };
    },
    async getListing(listingId) {
      const { data } = await db
        .from("listings")
        .select("street, city, state")
        .eq("id", listingId)
        .maybeSingle();
      return data ?? null;
    },
    async getAgent(agentId) {
      const { data } = await db
        .from("agent_profiles")
        .select("name, phone, email, brokerage")
        .eq("id", agentId)
        .maybeSingle();
      return data ?? null;
    },
  };
}

async function addGoogleEvent(
  db: ReturnType<typeof getAdminClient>,
  agentId: string,
  e: Parameters<BookingDeps["addGoogleEvent"]>[1]
) {
  if (!isGoogleConfigured()) return;

  const { data: fullAgent } = await db
    .from("agent_profiles")
    .select("google_access_token, google_refresh_token, google_token_expires_at")
    .eq("id", agentId)
    .single();
  if (!fullAgent?.google_access_token) return;

  let accessToken = fullAgent.google_access_token;
  const expiresAt = fullAgent.google_token_expires_at
    ? new Date(fullAgent.google_token_expires_at)
    : null;

  // Refresh token if expired/expiring soon
  if (expiresAt && expiresAt < new Date() && fullAgent.google_refresh_token) {
    const refreshed = await refreshAccessToken(fullAgent.google_refresh_token);
    if (refreshed) {
      accessToken = refreshed.access_token;
      const newExpiresAt = new Date(Date.now() + (refreshed.expires_in - 60) * 1000).toISOString();
      await db
        .from("agent_profiles")
        .update({ google_access_token: accessToken, google_token_expires_at: newExpiresAt })
        .eq("id", agentId);
    }
  }

  // Parse showing time to ISO strings.
  // NOTE: new Date(y, m, d, h, min) uses the SERVER's timezone, and no agent or
  // property timezone is stored, so the event time is only correct when the
  // server timezone matches the agent's. Unchanged by this patch; the timezone
  // phase replaces it.
  const timeMatch = String(e.showingTime).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!timeMatch) return;
  let hour = parseInt(timeMatch[1], 10);
  const minute = parseInt(timeMatch[2], 10);
  if (timeMatch[3].toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (timeMatch[3].toUpperCase() === "AM" && hour === 12) hour = 0;
  const [yStr, mStr, dStr] = e.showingDate.split("-");
  const startDate = new Date(parseInt(yStr), parseInt(mStr) - 1, parseInt(dStr), hour, minute);
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

  await createCalendarEvent(accessToken, {
    summary: `Showing - ${e.listingAddress}`,
    description: [
      `Buyer: ${e.name}`,
      e.phone ? `Phone: ${formatPhone(e.phone)}` : null,
      e.message ? `Notes: ${e.message}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    location: e.listingAddress,
    startISO: startDate.toISOString(),
    endISO: endDate.toISOString(),
    attendeeName: e.name,
    attendeeEmail: e.email,
  });
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const db = getAdminClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com";
    const resendKey = process.env.RESEND_API_KEY;

    const deps: BookingDeps = {
      now: () => new Date(),
      store: buildStore(db),
      spamCheck: (input) =>
        checkHoneypotAndTiming({
          honeypot: input.honeypot,
          formStartedAt: typeof input.formStartedAt === "number" ? input.formStartedAt : undefined,
          listingId: input.listingId,
          email: input.email,
        }),
      emailEnabled: Boolean(resendKey),
      async sendEmail(msg) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify(msg),
        });
        if (!res.ok) throw new Error(`Resend responded ${res.status}`);
      },
      addGoogleEvent: (agentId, e) => addGoogleEvent(db, agentId, e),
      enrollShowingFollowUps(leadId, listingId, agentId) {
        fetch(`${appUrl}/api/follow-ups/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...internalHeaders() },
          body: JSON.stringify({ leadId, listingId, agentId, sequenceType: "showing" }),
        }).catch((err) => console.error("Follow-up schedule error:", err));
      },
      notifyAgentPush(agentId, payload) {
        sendPushToAgent(agentId, payload).catch((err) => console.error("Push error:", err));
      },
      appUrl,
    };

    const result = await processBookingRequest(body, deps);
    return NextResponse.json(result.body, { status: result.status, headers: result.headers });
  } catch (err) {
    console.error("Showing booking error:", err);
    return NextResponse.json({ error: "Failed to book showing" }, { status: 500 });
  }
}
