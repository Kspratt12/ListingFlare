"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  MessageSquare,
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  CalendarCheck,
  Star,
  Clock,
  Loader2,
} from "lucide-react";

interface Event {
  id: string;
  type:
    | "inquiry"
    | "ai_reply"
    | "agent_reply"
    | "inbound_reply"
    | "follow_up_sent"
    | "follow_up_scheduled"
    | "showing_booked"
    | "feedback";
  title: string;
  subtitle?: string;
  at: string;
}

const TYPE_STYLE: Record<string, { icon: typeof Sparkles; color: string; bg: string }> = {
  inquiry: { icon: ArrowDownLeft, color: "text-gray-600", bg: "bg-gray-100" },
  ai_reply: { icon: Sparkles, color: "text-brand-600", bg: "bg-brand-50" },
  agent_reply: { icon: ArrowUpRight, color: "text-brand-600", bg: "bg-brand-50" },
  inbound_reply: { icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50" },
  follow_up_sent: { icon: Send, color: "text-amber-600", bg: "bg-amber-50" },
  showing_booked: { icon: CalendarCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  feedback: { icon: Star, color: "text-yellow-600", bg: "bg-yellow-50" },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 30) return `${day}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface Props {
  leadId: string;
}

export default function LeadTimeline({ leadId }: Props) {
  const [events, setEvents] = useState<Event[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/leads/timeline?leadId=${leadId}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) setEvents(data.events || []);
      })
      .catch(() => {
        if (active) setEvents([]);
      });
    return () => {
      active = false;
    };
  }, [leadId]);

  if (!events) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    );
  }

  if (events.length === 0) return null;

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        <Clock className="h-3 w-3" />
        Timeline
      </p>
      <ol className="space-y-2">
        {events.map((event, i) => {
          const style = TYPE_STYLE[event.type] || TYPE_STYLE.inquiry;
          const Icon = style.icon;
          const isLast = i === events.length - 1;
          return (
            <li key={event.id} className="relative flex items-start gap-3">
              {/* Connector line */}
              {!isLast && (
                <span className="absolute left-3 top-6 h-full w-px bg-gray-200" />
              )}
              <div
                className={`relative z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${style.bg}`}
              >
                <Icon className={`h-3 w-3 ${style.color}`} />
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium text-gray-900">{event.title}</p>
                  <span className="text-[10px] text-gray-400">{timeAgo(event.at)}</span>
                </div>
                {event.subtitle && (
                  <p className="mt-0.5 truncate text-[11px] text-gray-500">{event.subtitle}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
