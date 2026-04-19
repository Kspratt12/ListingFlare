"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Plus,
  Search,
  Loader2,
  X,
  MapPin,
  Calendar,
  PhoneCall,
  Mail,
  Trash2,
  Pencil,
  Home,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { SellerProspect, SellerProspectSource, SellerProspectStage } from "@/lib/types";
import { formatPhone } from "@/lib/formatters";
import ContactButtons from "@/components/ContactButtons";
import { firstName } from "@/lib/contactLinks";

const STAGES: Array<{ value: SellerProspectStage; label: string; dot: string; bg: string; text: string; border: string }> = [
  { value: "prospect", label: "Prospect", dot: "bg-blue-400", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { value: "met", label: "Met", dot: "bg-purple-400", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  { value: "presentation", label: "Presented", dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  { value: "listed", label: "Listed", dot: "bg-orange-400", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  { value: "sold", label: "Sold", dot: "bg-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  { value: "dropped", label: "Dropped", dot: "bg-gray-400", bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200" },
];

const SOURCES: Array<{ value: SellerProspectSource; label: string }> = [
  { value: "referral", label: "Referral" },
  { value: "door_knock", label: "Door knocked" },
  { value: "expired_listing", label: "Expired listing" },
  { value: "farming", label: "Farming" },
  { value: "open_house", label: "Open house" },
  { value: "past_client", label: "Past client" },
  { value: "online", label: "Online" },
  { value: "other", label: "Other" },
];

function sourceLabel(v: SellerProspectSource): string {
  return SOURCES.find((s) => s.value === v)?.label || "Other";
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function SellerProspectsPage() {
  const [prospects, setProspects] = useState<SellerProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<"all" | SellerProspectStage>("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<SellerProspect | "new" | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/seller-prospects");
      if (!res.ok) {
        setError("Couldn't load prospects.");
        return;
      }
      const data = await res.json();
      setProspects(data.prospects || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: prospects.length };
    for (const s of STAGES) c[s.value] = 0;
    for (const p of prospects) c[p.stage] = (c[p.stage] || 0) + 1;
    return c;
  }, [prospects]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return prospects.filter((p) => {
      if (activeStage !== "all" && p.stage !== activeStage) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.street || "").toLowerCase().includes(q) ||
        (p.city || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.phone || "").toLowerCase().includes(q) ||
        (p.notes || "").toLowerCase().includes(q)
      );
    });
  }, [prospects, activeStage, search]);

  const handleSave = async (saved: SellerProspect) => {
    setProspects((prev) => {
      const existing = prev.findIndex((p) => p.id === saved.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setModal(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this prospect? This cannot be undone.")) return;
    const res = await fetch(`/api/seller-prospects/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProspects((prev) => prev.filter((p) => p.id !== id));
      setModal(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-600" />
            <h1 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              Seller Prospects
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Your pipeline of homeowners who could become your next listing.
          </p>
        </div>
        <button
          onClick={() => setModal("new")}
          className="flex items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          Add prospect
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stage tabs */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveStage("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            activeStage === "all"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All <span className={activeStage === "all" ? "text-gray-300" : "text-gray-400"}>{counts.all}</span>
        </button>
        {STAGES.map((s) => {
          const count = counts[s.value] || 0;
          if (count === 0 && activeStage !== s.value) return null;
          const isActive = activeStage === s.value;
          return (
            <button
              key={s.value}
              onClick={() => setActiveStage(s.value)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-gray-900 text-white"
                  : `${s.bg} ${s.text} hover:brightness-95`
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {s.label} <span className={isActive ? "text-gray-300" : "opacity-60"}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      {prospects.length > 5 && (
        <div className="mt-4 relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, address, notes..."
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="mt-6 h-40 animate-pulse rounded-xl bg-gray-100" />
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
            <Sparkles className="h-5 w-5 text-brand-600" />
          </div>
          <h3 className="mt-4 font-serif text-lg font-semibold text-gray-900">
            {prospects.length === 0 ? "Your first seller prospect" : "Nothing in this stage yet"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            {prospects.length === 0
              ? "Log every homeowner you meet through referrals, door knocking, expired listings, or farming. Track them from first conversation to closed deal."
              : "Move a prospect here by updating their stage."}
          </p>
          {prospects.length === 0 && (
            <button
              onClick={() => setModal("new")}
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" />
              Add your first prospect
            </button>
          )}
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {filtered.map((p) => {
            const stage = STAGES.find((s) => s.value === p.stage);
            const fuDays = daysUntil(p.follow_up_date);
            const overdue = fuDays != null && fuDays < 0;
            const today = fuDays === 0;
            const soon = fuDays != null && fuDays > 0 && fuDays <= 3;
            return (
              <li
                key={p.id}
                className="group rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={() => setModal(p)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{p.name}</h3>
                      {stage && (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${stage.bg} ${stage.text} ${stage.border}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${stage.dot}`} />
                          {stage.label}
                        </span>
                      )}
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        {sourceLabel(p.source)}
                      </span>
                      {overdue && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                          <Calendar className="h-2.5 w-2.5" />
                          Follow up overdue
                        </span>
                      )}
                      {today && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          <Calendar className="h-2.5 w-2.5" />
                          Follow up today
                        </span>
                      )}
                      {soon && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          <Calendar className="h-2.5 w-2.5" />
                          In {fuDays} {fuDays === 1 ? "day" : "days"}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                      {(p.street || p.city) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[p.street, p.city, p.state].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {p.phone && (
                        <span className="flex items-center gap-1">
                          <PhoneCall className="h-3 w-3" />
                          {formatPhone(p.phone)}
                        </span>
                      )}
                      {p.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {p.email}
                        </span>
                      )}
                      {p.estimated_value && (
                        <span className="flex items-center gap-1 font-medium text-gray-600">
                          <Home className="h-3 w-3" />
                          ${p.estimated_value.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {p.notes && (
                      <p className="mt-2 line-clamp-1 text-xs text-gray-500">{p.notes}</p>
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    <ContactButtons
                      phone={p.phone}
                      email={p.email}
                      size="sm"
                      smsBody={`Hi ${firstName(p.name)}, following up on our conversation about your home. Got a minute?`}
                      emailSubject="Following up"
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Modal */}
      {modal && (
        <ProspectModal
          prospect={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={modal !== "new" ? handleDelete : undefined}
        />
      )}
    </div>
  );
}

function ProspectModal({
  prospect,
  onClose,
  onSave,
  onDelete,
}: {
  prospect: SellerProspect | null;
  onClose: () => void;
  onSave: (p: SellerProspect) => void;
  onDelete?: (id: string) => void;
}) {
  const isNew = prospect === null;
  const [form, setForm] = useState({
    name: prospect?.name || "",
    street: prospect?.street || "",
    city: prospect?.city || "",
    state: prospect?.state || "",
    zip: prospect?.zip || "",
    phone: prospect?.phone || "",
    email: prospect?.email || "",
    source: (prospect?.source || "referral") as SellerProspectSource,
    stage: (prospect?.stage || "prospect") as SellerProspectStage,
    estimated_value: prospect?.estimated_value?.toString() || "",
    notes: prospect?.notes || "",
    follow_up_date: prospect?.follow_up_date || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        street: form.street || null,
        city: form.city || null,
        state: form.state || null,
        zip: form.zip || null,
        phone: form.phone || null,
        email: form.email || null,
        source: form.source,
        stage: form.stage,
        estimated_value: form.estimated_value ? Number(form.estimated_value.replace(/[^0-9.]/g, "")) : null,
        notes: form.notes || null,
        follow_up_date: form.follow_up_date || null,
      };
      const url = isNew ? "/api/seller-prospects" : `/api/seller-prospects/${prospect!.id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't save");
        return;
      }
      onSave(data.prospect);
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="font-serif text-lg font-semibold text-gray-900">
            {isNew ? "Add a seller prospect" : "Edit prospect"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Sarah Jackson"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Street Address</label>
              <input
                type="text"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                placeholder="1234 Oak Lane"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-medium text-gray-600">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase().slice(0, 2) })}
                  placeholder="CA"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Zip</label>
                <input
                  type="text"
                  value={form.zip}
                  onChange={(e) => setForm({ ...form, zip: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Source</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value as SellerProspectSource })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                >
                  {SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Stage</label>
                <select
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value as SellerProspectStage })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                >
                  {STAGES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Estimated home value</label>
                <input
                  type="text"
                  value={form.estimated_value}
                  onChange={(e) => setForm({ ...form, estimated_value: e.target.value.replace(/[^0-9]/g, "") })}
                  placeholder="450000"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Follow-up date</label>
                <input
                  type="date"
                  value={form.follow_up_date}
                  onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={4}
                placeholder="What did you talk about? Any timeline? Life events? What matters to them?"
                className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3">
            {!isNew && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(prospect!.id)}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            ) : <span />}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-gray-950 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isNew ? <Plus className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                {isNew ? "Add prospect" : "Save changes"}
                {!saving && <ArrowRight className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
