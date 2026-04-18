"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  MessageCircle,
  Send,
  CalendarCheck,
  Bell,
  Sparkles,
  Zap,
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: "auto_reply" | "message_sent" | "follow_up" | "reminder" | "showing_booked" | "listing_notified";
  title: string;
  subtitle: string;
  when: string;
}

const TYPE_STYLE: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = {
  message_sent: { icon: MessageCircle, color: "text-brand-600", bg: "bg-brand-50" },
  auto_reply: { icon: Sparkles, color: "text-brand-600", bg: "bg-brand-50" },
  follow_up: { icon: Send, color: "text-purple-600", bg: "bg-purple-50" },
  reminder: { icon: Bell, color: "text-amber-600", bg: "bg-amber-50" },
  showing_booked: { icon: CalendarCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  listing_notified: { icon: Zap, color: "text-sky-600", bg: "bg-sky-50" },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/dashboard/activity")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setItems(data.activity || []);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-brand-500" />
          <h3 className="text-sm font-semibold text-gray-900">Automation Activity</h3>
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-brand-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            What ListingFlare did for you this week
          </h3>
        </div>
        {items.length > 0 && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
            <Zap className="h-5 w-5 text-gray-300" />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            No automated activity yet. It&apos;ll kick in as leads come through.
          </p>
        </div>
      ) : (
        <ol className="space-y-2.5">
          {items.map((item) => {
            const style = TYPE_STYLE[item.type] || TYPE_STYLE.message_sent;
            const Icon = style.icon;
            return (
              <li key={item.id} className="flex items-start gap-3">
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${style.bg}`}
                >
                  <Icon className={`h-3.5 w-3.5 ${style.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.title}
                    </p>
                    <span className="flex-shrink-0 text-[11px] text-gray-400">
                      {timeAgo(item.when)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-gray-500">{item.subtitle}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
