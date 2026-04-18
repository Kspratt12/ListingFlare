"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, AgentProfile } from "@/lib/types";
import {
  MessageSquare, Mail, Phone, Calendar, Home, ChevronDown,
  X, Loader2, ArrowUpDown, Lock, Trash2, Pencil, Sparkles,
  LayoutList, Columns3, Search, Download,
} from "lucide-react";
import { formatPhone } from "@/lib/formatters";
import { getSubscriptionLimits } from "@/lib/subscription";
import Link from "next/link";
import LeadPipeline from "@/components/LeadPipeline";
import LeadMessageThread from "@/components/LeadMessageThread";
import HotLeadBadge from "@/components/HotLeadBadge";
import { calculateHotScore } from "@/lib/hotScore";

const LEAD_STATUSES = [
  { value: "new", label: "New", color: "bg-blue-50 text-blue-700 border-blue-300" },
  { value: "contacted", label: "Contacted", color: "bg-purple-50 text-purple-700 border-purple-300" },
  { value: "showing_scheduled", label: "Showing Scheduled", color: "bg-orange-50 text-orange-700 border-orange-300" },
  { value: "offer_made", label: "Offer Made", color: "bg-amber-50 text-amber-700 border-amber-300" },
  { value: "under_contract", label: "Under Contract", color: "bg-teal-50 text-teal-700 border-teal-300" },
  { value: "closed", label: "Closed", color: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  { value: "lost", label: "Lost", color: "bg-gray-50 text-gray-500 border-gray-200" },
] as const;

function getStatusStyle(status: string) {
  return LEAD_STATUSES.find((s) => s.value === status)?.color || LEAD_STATUSES[0].color;
}

type SortField = "name" | "created_at" | "status";
type SortDir = "asc" | "desc";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [editingLead, setEditingLead] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "pipeline">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const limits = getSubscriptionLimits(profile);
  const supabase = createClient();

  useEffect(() => {
    async function fetchLeads() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from("agent_profiles").select("*").eq("id", user.id).single();
        if (p) setProfile(p as AgentProfile);
      }
      const { data } = await supabase
        .from("leads")
        .select(`*, listing:listings(street, city, state)`)
        .order("created_at", { ascending: false }) as { data: Lead[] | null };
      setLeads((data as Lead[]) || []);
      setLoading(false);
    }
    fetchLeads();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateLeadStatus = async (id: string, status: string) => {
    await supabase.from("leads").update({ status, is_read: true }).eq("id", id);
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: status as Lead["status"], is_read: true } : l))
    );
    if (selectedLead?.id === id) {
      setSelectedLead((prev) => prev ? { ...prev, status: status as Lead["status"], is_read: true } : null);
    }
  };

  const deleteLead = async (id: string) => {
    await supabase.from("leads").delete().eq("id", id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setSelectedLead(null);
    setDeleteConfirm(false);
  };

  const saveLeadEdit = async () => {
    if (!selectedLead) return;
    await supabase.from("leads").update({
      name: editName,
      email: editEmail,
      phone: editPhone,
    }).eq("id", selectedLead.id);
    setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, name: editName, email: editEmail, phone: editPhone } : l));
    setSelectedLead((prev) => prev ? { ...prev, name: editName, email: editEmail, phone: editPhone } : null);
    setEditingLead(false);
  };

  const openLead = (lead: Lead) => {
    setSelectedLead(lead);
    setEditingLead(false);
    setDeleteConfirm(false);
    setEditName(lead.name);
    setEditEmail(lead.email);
    setEditPhone(lead.phone);
    if (!lead.is_read) {
      supabase.from("leads").update({ is_read: true }).eq("id", lead.id);
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, is_read: true } : l)));
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids: string[]) => {
    setSelectedLeadIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(ids);
    });
  };

  const bulkUpdateStatus = async (status: string) => {
    const ids = Array.from(selectedLeadIds);
    if (ids.length === 0) return;
    await supabase.from("leads").update({ status, is_read: true }).in("id", ids);
    setLeads((prev) =>
      prev.map((l) =>
        ids.includes(l.id) ? { ...l, status: status as Lead["status"], is_read: true } : l
      )
    );
    setSelectedLeadIds(new Set());
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedLeadIds);
    if (ids.length === 0) return;
    await supabase.from("leads").delete().in("id", ids);
    setLeads((prev) => prev.filter((l) => !ids.includes(l.id)));
    setSelectedLeadIds(new Set());
    setBulkDeleteConfirm(false);
  };

  const exportToCSV = () => {
    const rows = filteredLeads.map((l) => ({
      name: l.name,
      email: l.email,
      phone: l.phone,
      status: l.status,
      message: l.message,
      listing: l.listing ? `${l.listing.street}, ${l.listing.city}, ${l.listing.state}` : "",
      created_at: l.created_at,
    }));
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const v = String((r as Record<string, unknown>)[h] ?? "").replace(/"/g, '""');
            return `"${v}"`;
          })
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateDraft = async (lead: Lead) => {
    // Warn if overwriting existing draft
    if (lead.auto_reply_draft) {
      if (!confirm("Generate a new AI draft? This will replace the existing draft.")) {
        return;
      }
    }
    setGeneratingDraft(true);
    try {
      const res = await fetch("/api/leads/auto-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      if (!res.ok) throw new Error("Failed");
      const { draft } = await res.json();
      if (draft) {
        setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, auto_reply_draft: draft } : l));
        setSelectedLead((prev) => prev?.id === lead.id ? { ...prev, auto_reply_draft: draft } : prev);
      }
    } catch {
      // Silently fail
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "created_at" ? "desc" : "asc");
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    });

  // Read ?status=X from URL on mount so Analytics can deep-link here
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status) setFilterStatus(status);
  }, []);

  const matchesSearch = (lead: Lead) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      lead.name.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q) ||
      (lead.phone || "").toLowerCase().includes(q) ||
      (lead.message || "").toLowerCase().includes(q) ||
      (lead.listing?.street || "").toLowerCase().includes(q) ||
      (lead.listing?.city || "").toLowerCase().includes(q)
    );
  };

  const filteredLeads = (filterStatus === "all" ? leads : leads.filter((l) => l.status === filterStatus))
    .filter(matchesSearch);

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortField === "name") return a.name.localeCompare(b.name) * dir;
    if (sortField === "status") return a.status.localeCompare(b.status) * dir;
    return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
  });

  const statusCounts = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button onClick={() => handleSort(field)} className="flex items-center gap-1 group">
      {label}
      <ArrowUpDown className={`h-3 w-3 transition-colors ${sortField === field ? "text-brand-600" : "text-gray-300 group-hover:text-gray-400"}`} />
    </button>
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">Leads</h1>
          <p className="mt-1 text-gray-500">Contact form submissions from your listing pages.</p>
        </div>
        {leads.length > 0 && (
          <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              List
            </button>
            <button
              onClick={() => setViewMode("pipeline")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "pipeline"
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Pipeline
            </button>
          </div>
        )}
      </div>

      {leads.length > 0 && (
        <>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, phone, listing…"
                className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>
            <button
              onClick={exportToCSV}
              disabled={filteredLeads.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>

          {/* Bulk action bar */}
          {selectedLeadIds.size > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5">
                <span className="text-xs font-medium text-brand-700">
                  {selectedLeadIds.size} selected
                </span>
                <div className="relative">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        bulkUpdateStatus(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    defaultValue=""
                    className="appearance-none rounded-md border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    aria-label="Change status for selected leads"
                  >
                    <option value="">Change status…</option>
                    {LEAD_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                </div>
                <button
                  onClick={() => setBulkDeleteConfirm(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
                <button
                  onClick={() => setSelectedLeadIds(new Set())}
                  className="ml-auto rounded-md px-2 py-1 text-[11px] text-gray-500 hover:bg-white hover:text-gray-700"
                >
                  Clear
                </button>
              </div>

              {/* Inline bulk delete confirmation */}
              {bulkDeleteConfirm && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="flex-1 text-xs font-medium text-red-900">
                    Permanently delete {selectedLeadIds.size} lead{selectedLeadIds.size !== 1 ? "s" : ""}? This cannot be undone.
                  </p>
                  <button
                    onClick={() => setBulkDeleteConfirm(false)}
                    className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={bulkDelete}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Delete Permanently
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {leads.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus("all")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filterStatus === "all" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            All ({leads.length})
          </button>
          {LEAD_STATUSES.map((s) => {
            const count = statusCounts[s.value] || 0;
            if (count === 0) return null;
            return (
              <button
                key={s.value}
                onClick={() => setFilterStatus(s.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  filterStatus === s.value ? "border-gray-900 bg-gray-900 text-white" : `${s.color} hover:opacity-80`
                }`}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="mt-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <MessageSquare className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mt-4 font-serif text-xl font-semibold text-gray-900">No leads yet</h3>
          <p className="mt-2 text-gray-500">When visitors submit the contact form on your listings, they&apos;ll show up here.</p>
        </div>
      ) : viewMode === "pipeline" ? (
        <LeadPipeline
          leads={leads}
          onSelectLead={openLead}
          onUpdateStatus={updateLeadStatus}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-6 hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[4%]" />
                <col className="w-[24%]" />
                <col className="w-[16%]" />
                <col className="w-[23%]" />
                <col className="w-[17%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-3 py-3.5">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={
                        sortedLeads.length > 0 &&
                        sortedLeads.every((l) => selectedLeadIds.has(l.id))
                      }
                      onChange={() => toggleSelectAll(sortedLeads.map((l) => l.id))}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-400"
                    />
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <SortButton field="name" label="Contact" />
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Listing</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Message</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <SortButton field="status" label="Status" />
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <SortButton field="created_at" label="Date" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => openLead(lead)}
                    className={`group cursor-pointer transition-colors hover:bg-gray-50 ${!lead.is_read ? "bg-brand-50/30" : ""} ${selectedLeadIds.has(lead.id) ? "bg-brand-50/40" : ""}`}
                  >
                    <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${lead.name}`}
                        checked={selectedLeadIds.has(lead.id)}
                        onChange={() => toggleSelectLead(lead.id)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-400"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        {!lead.is_read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-gray-900">{lead.name}</p>
                            <HotLeadBadge tier={calculateHotScore({ lead }).tier} compact />
                            {lead.auto_reply_draft && (
                              <span className="flex flex-shrink-0 items-center gap-0.5 rounded-full border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-600">
                                <Sparkles className="h-2.5 w-2.5" /> AI
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-gray-500">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                          {lead.phone && (
                            <div className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-xs text-gray-500">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              {formatPhone(lead.phone)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {lead.listing && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Home className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                          <span className="truncate">{lead.listing.street}</span>
                        </div>
                      )}
                      {lead.listing && (
                        <div className="mt-0.5 truncate pl-5 text-xs text-gray-400">
                          {lead.listing.city}, {lead.listing.state}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="line-clamp-2 text-sm text-gray-600">{lead.message || "-"}</p>
                    </td>
                    <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block max-w-full">
                        <select
                          value={lead.status}
                          onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                          className={`block max-w-full appearance-none truncate rounded-full border py-1 pl-3 pr-7 text-xs font-medium cursor-pointer ${getStatusStyle(lead.status)}`}
                        >
                          {LEAD_STATUSES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 opacity-50" />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                          {new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        {limits.isPaid && (
                          <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openLead(lead)}
                              aria-label="Edit lead"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                              title="Edit lead"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => { openLead(lead); setTimeout(() => setDeleteConfirm(true), 100); }}
                              aria-label="Delete lead"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                              title="Delete lead"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-6 space-y-4 md:hidden">
            {sortedLeads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => openLead(lead)}
                className={`cursor-pointer rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-brand-200 ${!lead.is_read ? "border-l-4 border-l-brand-400" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{lead.name}</p>
                      {lead.auto_reply_draft && (
                        <span className="flex items-center gap-0.5 rounded-full bg-brand-50 border border-brand-200 px-1.5 py-0.5 text-[10px] font-medium text-brand-600">
                          <Sparkles className="h-2.5 w-2.5" /> AI Draft
                        </span>
                      )}
                    </div>
                    {lead.listing && <p className="mt-0.5 text-sm text-gray-500">{lead.listing.street}</p>}
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(lead.created_at)}</span>
                </div>
                {lead.message && <p className="mt-3 text-sm text-gray-600 line-clamp-2">{lead.message}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-brand-600">Tap to reply</span>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={lead.status}
                      onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                      className={`appearance-none rounded-full border py-1 pl-2.5 pr-6 text-xs font-medium cursor-pointer ${getStatusStyle(lead.status)}`}
                    >
                      {LEAD_STATUSES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 opacity-50" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Lead Detail / Reply Panel */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedLead(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-gray-900">{selectedLead.name}</h3>
                {selectedLead.listing && (
                  <p className="text-sm text-gray-500">{selectedLead.listing.street}, {selectedLead.listing.city}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {limits.isPaid && (
                  <>
                    <button
                      onClick={() => setEditingLead(!editingLead)}
                      aria-label="Edit lead"
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${editingLead ? "bg-brand-50 text-brand-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"}`}
                      title="Edit lead"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(true)}
                      aria-label="Delete lead"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Delete lead"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button onClick={() => setSelectedLead(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Delete confirmation */}
            {deleteConfirm && (
              <div className="border-b border-red-100 bg-red-50 px-6 py-4">
                <p className="text-sm font-medium text-red-800">Are you sure you want to delete this lead?</p>
                <p className="mt-1 text-xs text-red-600">This will permanently remove the lead and all associated data. This cannot be undone.</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteLead(selectedLead.id)}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="border-b border-gray-100 px-6 py-4">
              {editingLead ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Email</label>
                    <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Phone</label>
                    <input value={formatPhone(editPhone)} onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveLeadEdit} className="rounded-lg bg-gray-950 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800">Save Changes</button>
                    <button onClick={() => setEditingLead(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              ) : (
              <div className="flex flex-wrap gap-4 text-sm">
                <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-1.5 text-brand-600 hover:underline">
                  <Mail className="h-4 w-4" />{selectedLead.email}
                </a>
                {selectedLead.phone && (
                  <a href={`tel:${selectedLead.phone}`} className="flex items-center gap-1.5 text-brand-600 hover:underline">
                    <Phone className="h-4 w-4" />{formatPhone(selectedLead.phone)}
                  </a>
                )}
              </div>
              )}
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-gray-400">{formatDate(selectedLead.created_at)}</span>
                <div className="relative">
                  <select
                    value={selectedLead.status}
                    onChange={(e) => updateLeadStatus(selectedLead.id, e.target.value)}
                    className={`appearance-none rounded-full border py-1 pl-3 pr-7 text-xs font-medium cursor-pointer ${getStatusStyle(selectedLead.status)}`}
                  >
                    {LEAD_STATUSES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 opacity-50" />
                </div>
              </div>
            </div>

            {/* Conversation Thread */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Conversation</p>
                {limits.canReplyToLeads && !selectedLead.auto_reply_draft && (
                  <button
                    onClick={() => generateDraft(selectedLead)}
                    disabled={generatingDraft}
                    className="flex items-center gap-1 rounded-md bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50"
                  >
                    {generatingDraft ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {generatingDraft ? "Generating..." : "AI Draft"}
                  </button>
                )}
              </div>
              <LeadMessageThread
                lead={selectedLead}
                canReply={limits.canReplyToLeads}
                onSent={() => {
                  if (selectedLead.status === "new") {
                    updateLeadStatus(selectedLead.id, "contacted");
                  }
                }}
              />
              {!limits.canReplyToLeads && (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 p-4">
                  <Lock className="h-5 w-5 flex-shrink-0 text-brand-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Upgrade to reply to leads</p>
                    <p className="mt-0.5 text-xs text-gray-500">Reply directly from your dashboard with the paid plan.</p>
                  </div>
                  <Link href="/dashboard/billing" className="flex-shrink-0 rounded-full bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">
                    Upgrade
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
