import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkHoneypotAndTiming, checkRateLimits } from "@/lib/antiSpam";
import { sendPushToAgent } from "@/lib/sendPush";
import { getPropertyTimeZone } from "@/lib/propertyTimeZone";
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
    getTimeZone: (listingId, agentId) => getPropertyTimeZone(db, listingId, agentId),
    async findSlotShowings(listingId, date, time) {
      const { data } = await db
        .from("showings")
        .select("id, email, status")
        .eq("listing_id", listingId)
        .eq("showing_date", date)
        .eq("showing_time", time)
        .in("status", ["requested", "confirmed"]);
      return (data ?? []).map((s) => ({ id: s.id, email: String(s.email || ""), status: s.status }));
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
