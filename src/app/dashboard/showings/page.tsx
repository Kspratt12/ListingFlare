"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Showing } from "@/lib/types";
import {
  CalendarDays,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  ChevronDown,
  Home,
  Loader2,
} from "lucide-react";
import { formatPhone } from "@/lib/formatters";

type ShowingWithListing = Omit<Showing, "listing"> & {
  listing?: { street: string; city: string; state: string } | null;
};

const STATUS_OPTIONS = [
  { value: "confirmed", label: "Confirmed", color: "bg-blue-50 text-blue-700 border-blue-300" },
  { value: "completed", label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  { value: "canceled", label: "Canceled", color: "bg-gray-50 text-gray-500 border-gray-200" },
  { value: "no_show", label: "No Show", color: "bg-red-50 text-red-700 border-red-300" },
] as const;

function getStatusStyle(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.color || STATUS_OPTIONS[0].color;
}

function formatShowingDate(date: string) {
  const d = new Date(date + "T12:00:00");
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  if (isToday) return "Today";
  if (isTomorrow) return "Tomorrow";

  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function groupByDate(showings: ShowingWithListing[]) {
  const groups: Record<string, ShowingWithListing[]> = {};
  for (const s of showings) {
    const key = s.showing_date;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export default function ShowingsPage() {
  const [showings, setShowings] = useState<ShowingWithListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (active) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("showings")
        .select(`*, listing:listings(street, city, state)`)
        .eq("agent_id", user.id)
        .order("showing_date", { ascending: true })
        .order("showing_time", { ascending: true });

      if (active) {
        setShowings((data as ShowingWithListing[]) || []);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const supabase = createClient();
    await supabase.from("showings").update({ status }).eq("id", id);
    setShowings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: status as Showing["status"] } : s))
    );
  };

  const today = new Date().toISOString().split("T")[0];

  const filtered = useMemo(() => {
    if (filter === "upcoming") {
      return showings.filter((s) => s.showing_date >= today && s.status === "confirmed");
    }
    if (filter === "past") {
      return showings
        .filter((s) => s.showing_date < today || s.status !== "confirmed")
        .reverse();
    }
    return showings;
  }, [showings, filter, today]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const counts = useMemo(() => {
    const upcoming = showings.filter(
      (s) => s.showing_date >= today && s.status === "confirmed"
    ).length;
    const past = showings.length - upcoming;
    return { upcoming, past, all: showings.length };
  }, [showings, today]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">
            Showings
          </h1>
          <p className="mt-1 text-gray-500">
            Every property showing booked through your listings.
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("upcoming")}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            filter === "upcoming"
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Upcoming ({counts.upcoming})
        </button>
        <button
          onClick={() => setFilter("past")}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            filter === "past"
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Past ({counts.past})
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            filter === "all"
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          All ({counts.all})
        </button>
      </div>

      {loading ? (
        <div className="mt-8 flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <CalendarDays className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mt-4 font-serif text-xl font-semibold text-gray-900">
            {filter === "upcoming" ? "No upcoming showings" : "No showings yet"}
          </h3>
          <p className="mt-2 text-gray-500">
            When buyers book a showing from your listing pages, they&apos;ll appear here.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Home className="h-4 w-4" />
            View Listings
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {grouped.map(([date, dayShowings]) => (
            <div key={date}>
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-brand-500" />
                <h3 className="text-sm font-semibold text-gray-900">
                  {formatShowingDate(date)}
                </h3>
                <span className="text-xs text-gray-400">
                  {dayShowings.length} showing{dayShowings.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2">
                {dayShowings.map((showing) => {
                  const address = showing.listing
                    ? `${showing.listing.street}, ${showing.listing.city}, ${showing.listing.state}`
                    : "Property";
                  return (
                    <div
                      key={showing.id}
                      className="rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-brand-200"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          {/* Time + Address */}
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-sm font-semibold text-brand-700">
                              <Clock className="h-3.5 w-3.5" />
                              {showing.showing_time}
                            </span>
                            <span className="flex items-center gap-1.5 truncate text-sm text-gray-600">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                              {address}
                            </span>
                          </div>

                          {/* Buyer info */}
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                              <User className="h-3.5 w-3.5 text-gray-400" />
                              {showing.name}
                            </div>
                            {showing.email && (
                              <a
                                href={`mailto:${showing.email}`}
                                className="flex items-center gap-1.5 truncate text-xs text-brand-600 hover:underline"
                              >
                                <Mail className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{showing.email}</span>
                              </a>
                            )}
                            {showing.phone && (
                              <a
                                href={`tel:${showing.phone}`}
                                className="flex items-center gap-1.5 whitespace-nowrap text-xs text-brand-600 hover:underline"
                              >
                                <Phone className="h-3 w-3" />
                                {formatPhone(showing.phone)}
                              </a>
                            )}
                          </div>

                          {showing.message && (
                            <p className="mt-2 text-xs text-gray-500">
                              <span className="font-medium text-gray-600">Notes:</span> {showing.message}
                            </p>
                          )}
                        </div>

                        {/* Status */}
                        <div className="relative">
                          <select
                            value={showing.status}
                            onChange={(e) => updateStatus(showing.id, e.target.value)}
                            className={`cursor-pointer appearance-none rounded-full border py-1 pl-3 pr-7 text-xs font-medium ${getStatusStyle(showing.status)}`}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 opacity-50" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
