"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Flame, X, MessageSquare, CalendarDays } from "lucide-react";
import { calculateHotScore } from "@/lib/hotScore";

interface Alert {
  id: string;
  type: "lead" | "showing" | "inbound";
  title: string;
  subtitle: string;
  href: string;
  timestamp: number;
}

const SOUND_PREF_KEY = "lf_sound_alerts_enabled";

// Short generated beep using Web Audio API (no external file)
function playAlertSound() {
  try {
    const pref = localStorage.getItem(SOUND_PREF_KEY);
    if (pref === "false") return;
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.03);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    setTimeout(() => ctx.close(), 400);
  } catch {
    // Audio context not available or blocked
  }
}

export default function LiveLeadAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const userIdRef = useRef<string | null>(null);
  const mountedAtRef = useRef(Date.now());

  const dismiss = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  useEffect(() => {
    let leadChannel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    let showingChannel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    let messageChannel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;

    async function setup() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;

      // New lead inserts
      leadChannel = supabase
        .channel("live-leads")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "leads",
            filter: `agent_id=eq.${user.id}`,
          },
          (payload) => {
            const l = payload.new as Record<string, unknown>;
            // Ignore records that existed before this mount (e.g., initial snapshot)
            if (l.created_at && new Date(l.created_at as string).getTime() < mountedAtRef.current - 5000) return;

            const hot = calculateHotScore({
              lead: {
                status: ((l.status as string) || "new") as "new" | "contacted" | "showing_scheduled" | "offer_made" | "under_contract" | "closed" | "lost",
                phone: (l.phone as string) || "",
                message: (l.message as string) || "",
                created_at: (l.created_at as string) || new Date().toISOString(),
                auto_reply_draft: null,
                first_response_at: null,
                is_read: false,
              },
            });
            const fireEmoji = hot.tier === "hot" ? "🔥 " : hot.tier === "warm" ? "⭐ " : "";
            setAlerts((prev) => [
              {
                id: `lead-${l.id}`,
                type: "lead",
                title: `${fireEmoji}New lead: ${l.name || "Unknown"}`,
                subtitle: l.message
                  ? String(l.message).slice(0, 60)
                  : "Tap to view",
                href: `/dashboard/leads`,
                timestamp: Date.now(),
              },
              ...prev,
            ]);
            playAlertSound();
          }
        )
        .subscribe();

      // New showings
      showingChannel = supabase
        .channel("live-showings")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "showings",
            filter: `agent_id=eq.${user.id}`,
          },
          (payload) => {
            const s = payload.new as Record<string, unknown>;
            if (s.created_at && new Date(s.created_at as string).getTime() < mountedAtRef.current - 5000) return;
            setAlerts((prev) => [
              {
                id: `showing-${s.id}`,
                type: "showing",
                title: `📅 Showing booked: ${s.name || "Unknown"}`,
                subtitle: `${s.showing_date} at ${s.showing_time}`,
                href: `/dashboard/showings`,
                timestamp: Date.now(),
              },
              ...prev,
            ]);
            playAlertSound();
          }
        )
        .subscribe();

      // Inbound messages (buyer replies)
      messageChannel = supabase
        .channel("live-messages")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `agent_id=eq.${user.id}`,
          },
          (payload) => {
            const m = payload.new as Record<string, unknown>;
            if (m.direction !== "inbound") return;
            if (m.created_at && new Date(m.created_at as string).getTime() < mountedAtRef.current - 5000) return;
            setAlerts((prev) => [
              {
                id: `msg-${m.id}`,
                type: "inbound",
                title: `💬 New reply`,
                subtitle: String(m.body || "").slice(0, 60),
                href: `/dashboard/leads`,
                timestamp: Date.now(),
              },
              ...prev,
            ]);
            playAlertSound();
          }
        )
        .subscribe();
    }

    setup();

    return () => {
      const supabase = createClient();
      if (leadChannel) supabase.removeChannel(leadChannel);
      if (showingChannel) supabase.removeChannel(showingChannel);
      if (messageChannel) supabase.removeChannel(messageChannel);
    };
  }, []);

  // Auto-dismiss alerts after 10 seconds
  useEffect(() => {
    if (alerts.length === 0) return;
    const newest = alerts[0];
    const timer = setTimeout(() => dismiss(newest.id), 10000);
    return () => clearTimeout(timer);
  }, [alerts, dismiss]);

  if (alerts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex max-w-sm flex-col gap-2">
      {alerts.slice(0, 3).map((alert) => {
        const Icon =
          alert.type === "lead"
            ? Flame
            : alert.type === "showing"
              ? CalendarDays
              : MessageSquare;
        const accent =
          alert.type === "lead"
            ? "border-red-200 bg-red-50"
            : alert.type === "showing"
              ? "border-blue-200 bg-blue-50"
              : "border-purple-200 bg-purple-50";
        const iconColor =
          alert.type === "lead"
            ? "text-red-500"
            : alert.type === "showing"
              ? "text-blue-500"
              : "text-purple-500";

        return (
          <Link
            key={alert.id}
            href={alert.href}
            onClick={() => dismiss(alert.id)}
            className={`pointer-events-auto group flex items-start gap-3 rounded-xl border ${accent} bg-white px-4 py-3 shadow-lg transition-all animate-in slide-in-from-bottom-2 fade-in duration-300 hover:shadow-xl`}
          >
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white ${iconColor}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
              <p className="truncate text-xs text-gray-500">{alert.subtitle}</p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                dismiss(alert.id);
              }}
              aria-label="Dismiss"
              className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </Link>
        );
      })}
    </div>
  );
}
