"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, CalendarClock, Flame, ArrowRight, Bell } from "lucide-react";

interface Briefing {
  firstName: string;
  overnightLeads: number;
  todayShowings: Array<{ id: string; time: string; name: string; address: string }>;
  unreadLeads: number;
  hottestLead: {
    id: string;
    name: string;
    score: number;
    tier: string;
    reasons: string[];
    listing: string | null;
  } | null;
}

function getClientGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DailyBriefing() {
  const [data, setData] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/dashboard/briefing")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setData(d);
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
      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-brand-50/50 to-white p-5">
        <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
      </div>
    );
  }

  if (!data) return null;

  const hasBriefing =
    data.overnightLeads > 0 ||
    data.todayShowings.length > 0 ||
    data.unreadLeads > 0 ||
    data.hottestLead;

  if (!hasBriefing) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-brand-50/60 via-white to-brand-50/20 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand-500" />
        <h3 className="text-sm font-semibold text-gray-900">
          {getClientGreeting()}, {data.firstName}
        </h3>
      </div>

      <div className="mt-3 space-y-2">
        {data.overnightLeads > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>
              <strong>{data.overnightLeads}</strong> new lead{data.overnightLeads !== 1 ? "s" : ""} in the last 24 hours
            </span>
          </div>
        )}

        {data.unreadLeads > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Bell className="h-3 w-3 flex-shrink-0 text-brand-500" />
            <span>
              <strong>{data.unreadLeads}</strong> unread lead{data.unreadLeads !== 1 ? "s" : ""} waiting for you
            </span>
          </div>
        )}

        {data.todayShowings.length > 0 && (
          <div className="flex items-start gap-2 text-sm text-gray-700">
            <CalendarClock className="mt-0.5 h-3 w-3 flex-shrink-0 text-brand-500" />
            <div>
              <span>
                <strong>{data.todayShowings.length}</strong> showing{data.todayShowings.length !== 1 ? "s" : ""} today:
              </span>
              <ul className="mt-1 space-y-0.5">
                {data.todayShowings.slice(0, 3).map((s) => (
                  <li key={s.id} className="text-xs text-gray-600">
                    <strong className="text-gray-900">{s.time}</strong> - {s.name} at {s.address}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Hottest lead spotlight */}
      {data.hottestLead && data.hottestLead.tier !== "cold" && (
        <Link
          href="/dashboard/leads"
          className="mt-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50/60 p-3 transition-colors hover:bg-red-50"
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-500">
            <Flame className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
              Your hottest lead right now
            </p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">
              {data.hottestLead.name}
              {data.hottestLead.listing && (
                <span className="text-gray-500"> - {data.hottestLead.listing}</span>
              )}
            </p>
            {data.hottestLead.reasons.length > 0 && (
              <p className="mt-0.5 text-[11px] text-gray-500">
                {data.hottestLead.reasons.slice(0, 2).join(" - ")}
              </p>
            )}
          </div>
          <ArrowRight className="h-4 w-4 flex-shrink-0 text-red-500" />
        </Link>
      )}
    </div>
  );
}
