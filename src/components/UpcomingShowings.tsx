"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Showing } from "@/lib/types";
import { CalendarDays, Clock, User, MapPin, Phone, ArrowRight } from "lucide-react";
import { formatPhone } from "@/lib/formatters";

type ShowingWithListing = Omit<Showing, "listing"> & {
  listing?: { street: string; city: string; state: string } | null;
};

function formatShowingDate(date: string) {
  const d = new Date(date + "T12:00:00");
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  if (isToday) return "Today";
  if (isTomorrow) return "Tomorrow";

  const daysDiff = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff < 7 && daysDiff > 0) {
    return d.toLocaleDateString("en-US", { weekday: "long" });
  }

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface Props {
  limit?: number;
  compact?: boolean;
}

export default function UpcomingShowings({ limit = 5, compact = false }: Props) {
  const [showings, setShowings] = useState<ShowingWithListing[]>([]);
  const [loading, setLoading] = useState(true);

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

      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("showings")
        .select(`*, listing:listings(street, city, state)`)
        .eq("agent_id", user.id)
        .eq("status", "confirmed")
        .gte("showing_date", today)
        .order("showing_date", { ascending: true })
        .order("showing_time", { ascending: true })
        .limit(limit);

      if (active) {
        setShowings((data as ShowingWithListing[]) || []);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [limit]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-4 w-4 text-brand-500" />
          <h3 className="text-sm font-semibold text-gray-900">Upcoming Showings</h3>
        </div>
        <div className="space-y-2">
          <div className="h-14 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-14 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-brand-500" />
          <h3 className="text-sm font-semibold text-gray-900">Upcoming Showings</h3>
          {showings.length > 0 && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
              {showings.length}
            </span>
          )}
        </div>
        {!compact && (
          <Link
            href="/dashboard/showings"
            className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {showings.length === 0 ? (
        <div className="py-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
            <CalendarDays className="h-5 w-5 text-gray-300" />
          </div>
          <p className="mt-2 text-xs text-gray-400">No showings booked yet</p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            Buyers can book from your listing pages
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {showings.map((showing) => {
            const address = showing.listing
              ? `${showing.listing.street}, ${showing.listing.city}`
              : "Property";
            return (
              <Link
                key={showing.id}
                href="/dashboard/showings"
                className="block rounded-lg border border-gray-100 p-3 transition-colors hover:border-brand-200 hover:bg-brand-50/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                        <Clock className="h-2.5 w-2.5" />
                        {formatShowingDate(showing.showing_date)} · {showing.showing_time}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1 text-sm font-medium text-gray-900">
                      <User className="h-3 w-3 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{showing.name}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{address}</span>
                    </div>
                    {showing.phone && (
                      <div className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-xs text-gray-500">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        {formatPhone(showing.phone)}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
