import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface ActivityItem {
  id: string;
  type: "auto_reply" | "message_sent" | "follow_up" | "reminder" | "showing_booked" | "listing_notified";
  title: string;
  subtitle: string;
  when: string;
}

export async function GET() {
  const authClient = createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Last 7 days of activity across all automation
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [messages, followUps, showings, notifications] = await Promise.all([
    authClient
      .from("messages")
      .select("id, body, created_at, lead:leads(name)")
      .eq("agent_id", user.id)
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: false })
      .limit(15),
    authClient
      .from("follow_ups")
      .select("id, subject, day_number, sequence_type, sent_at, lead:leads(name)")
      .eq("agent_id", user.id)
      .eq("status", "sent")
      .gte("sent_at", weekAgo)
      .order("sent_at", { ascending: false })
      .limit(10),
    authClient
      .from("showings")
      .select("id, name, showing_date, showing_time, created_at, listing:listings(street)")
      .eq("agent_id", user.id)
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: false })
      .limit(10),
    authClient
      .from("listing_notifications")
      .select("id, sent_at, listing:listings(street)")
      .eq("agent_id", user.id)
      .gte("sent_at", weekAgo)
      .order("sent_at", { ascending: false })
      .limit(10),
  ]);

  const activity: ActivityItem[] = [];

  // Outbound messages (agent replies or AI auto-replies)
  for (const m of messages.data || []) {
    const lead = Array.isArray(m.lead) ? m.lead[0] : m.lead;
    activity.push({
      id: `msg-${m.id}`,
      type: "message_sent",
      title: `Replied to ${lead?.name || "a lead"}`,
      subtitle: (m.body || "").slice(0, 80).replace(/\s+/g, " "),
      when: m.created_at,
    });
  }

  // Follow-ups
  for (const f of followUps.data || []) {
    const lead = Array.isArray(f.lead) ? f.lead[0] : f.lead;
    activity.push({
      id: `fu-${f.id}`,
      type: "follow_up",
      title: `Day-${f.day_number} follow-up sent to ${lead?.name || "a lead"}`,
      subtitle: f.subject,
      when: f.sent_at,
    });
  }

  // Showings booked
  for (const s of showings.data || []) {
    const listing = Array.isArray(s.listing) ? s.listing[0] : s.listing;
    activity.push({
      id: `sh-${s.id}`,
      type: "showing_booked",
      title: `Showing booked by ${s.name}`,
      subtitle: `${listing?.street || "a property"} · ${s.showing_date} at ${s.showing_time}`,
      when: s.created_at,
    });
  }

  // Listing notifications
  const notifGroups = new Map<string, { street: string; count: number; when: string }>();
  for (const n of notifications.data || []) {
    const listing = Array.isArray(n.listing) ? n.listing[0] : n.listing;
    const key = listing?.street || n.id;
    const existing = notifGroups.get(key);
    if (existing) {
      existing.count++;
    } else {
      notifGroups.set(key, {
        street: listing?.street || "a listing",
        count: 1,
        when: n.sent_at,
      });
    }
  }
  notifGroups.forEach((group, key) => {
    activity.push({
      id: `notif-${key}`,
      type: "listing_notified",
      title: `Notified ${group.count} past lead${group.count !== 1 ? "s" : ""} about ${group.street}`,
      subtitle: "Re-engagement email sent",
      when: group.when,
    });
  });

  // Sort all activity by recency
  activity.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

  return NextResponse.json({ activity: activity.slice(0, 20) });
}
