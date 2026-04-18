"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Showing, Listing } from "@/lib/types";
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
  Search,
  Pencil,
  Plus,
  X,
  Save,
  Trash2,
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

const TIME_SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM",
];

interface ShowingEditModalProps {
  showing: ShowingWithListing | null;
  listings: Pick<Listing, "id" | "street" | "city" | "state">[];
  mode: "edit" | "create";
  onClose: () => void;
  onSaved: () => void;
}

function ShowingEditModal({ showing, listings, mode, onClose, onSaved }: ShowingEditModalProps) {
  const [date, setDate] = useState(showing?.showing_date || new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(showing?.showing_time || "10:00 AM");
  const [name, setName] = useState(showing?.name || "");
  const [email, setEmail] = useState(showing?.email || "");
  const [phone, setPhone] = useState(showing?.phone || "");
  const [message, setMessage] = useState(showing?.message || "");
  const [listingId, setListingId] = useState(showing?.listing_id || listings[0]?.id || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name || !date || !time || !listingId) {
      setError("Name, date, time, and listing are required");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (mode === "edit" && showing) {
        await supabase
          .from("showings")
          .update({
            showing_date: date,
            showing_time: time,
            name,
            email,
            phone,
            message,
            listing_id: listingId,
            reminder_24h_sent: false,
            reminder_1h_sent: false,
          })
          .eq("id", showing.id);
      } else {
        await supabase.from("showings").insert({
          agent_id: user.id,
          listing_id: listingId,
          lead_id: showing?.lead_id || null,
          showing_date: date,
          showing_time: time,
          name,
          email,
          phone,
          message,
          status: "confirmed",
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!showing || !confirm("Delete this showing? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      await supabase.from("showings").delete().eq("id", showing.id);
      onSaved();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
          <h3 className="font-serif text-lg font-bold text-gray-900">
            {mode === "edit" ? "Edit Showing" : "Add Showing"}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Property</label>
            <select
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              {listings.length === 0 && <option value="">No listings available</option>}
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.street}, {l.city}, {l.state}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Time</label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              >
                {TIME_SLOTS.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Buyer Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
              <input
                type="tel"
                value={formatPhone(phone)}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-6 py-3">
          {mode === "edit" && showing ? (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              {deleting ? "Deleting…" : "Delete"}
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 rounded-lg bg-gray-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Showing"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShowingsPage() {
  const [showings, setShowings] = useState<ShowingWithListing[]>([]);
  const [myListings, setMyListings] = useState<Pick<Listing, "id" | "street" | "city" | "state">[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingShowing, setEditingShowing] = useState<ShowingWithListing | null>(null);
  const [creatingShowing, setCreatingShowing] = useState(false);

  const reload = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const [showingsRes, listingsRes] = await Promise.all([
      supabase
        .from("showings")
        .select(`*, listing:listings(street, city, state)`)
        .eq("agent_id", user.id)
        .order("showing_date", { ascending: true })
        .order("showing_time", { ascending: true }),
      supabase
        .from("listings")
        .select("id, street, city, state")
        .eq("agent_id", user.id)
        .in("status", ["published", "pending", "draft"])
        .order("created_at", { ascending: false }),
    ]);
    setShowings((showingsRes.data as ShowingWithListing[]) || []);
    setMyListings(listingsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await reload();
    })();
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

  const matchesSearch = (s: ShowingWithListing) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.phone || "").toLowerCase().includes(q) ||
      (s.listing?.street || "").toLowerCase().includes(q) ||
      (s.listing?.city || "").toLowerCase().includes(q)
    );
  };

  const filtered = useMemo(() => {
    let base: ShowingWithListing[];
    if (filter === "upcoming") {
      base = showings.filter((s) => s.showing_date >= today && s.status === "confirmed");
    } else if (filter === "past") {
      base = showings.filter((s) => s.showing_date < today || s.status !== "confirmed");
      base = [...base].reverse();
    } else {
      base = showings;
    }
    return base.filter(matchesSearch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showings, filter, today, searchQuery]);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">
            Showings
          </h1>
          <p className="mt-1 text-gray-500">
            Every property showing booked through your listings.
          </p>
        </div>
        <button
          onClick={() => setCreatingShowing(true)}
          disabled={myListings.length === 0}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Showing
        </button>
      </div>

      {/* Search */}
      {showings.length > 0 && (
        <div className="mt-5 relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by buyer, property, email, phone…"
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </div>
      )}

      {/* Filter tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
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

                        {/* Status + Edit */}
                        <div className="flex items-center gap-2">
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
                          <button
                            onClick={() => setEditingShowing(showing)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            title="Edit showing"
                            aria-label="Edit showing"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
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

      {/* Edit/Add modals */}
      {editingShowing && (
        <ShowingEditModal
          showing={editingShowing}
          listings={myListings}
          mode="edit"
          onClose={() => setEditingShowing(null)}
          onSaved={reload}
        />
      )}
      {creatingShowing && (
        <ShowingEditModal
          showing={null}
          listings={myListings}
          mode="create"
          onClose={() => setCreatingShowing(false)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
