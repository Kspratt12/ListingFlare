"use client";

import { useMemo } from "react";
import type { Lead } from "@/lib/types";
import { Mail, Phone, Home, Clock, ChevronDown, Sparkles } from "lucide-react";
import { formatPhone } from "@/lib/formatters";

const PIPELINE_STAGES = [
  { value: "new", label: "New", color: "border-blue-400", bg: "bg-blue-50", dot: "bg-blue-400" },
  { value: "contacted", label: "Contacted", color: "border-purple-400", bg: "bg-purple-50", dot: "bg-purple-400" },
  { value: "showing_scheduled", label: "Showing", color: "border-orange-400", bg: "bg-orange-50", dot: "bg-orange-400" },
  { value: "offer_made", label: "Offer", color: "border-amber-400", bg: "bg-amber-50", dot: "bg-amber-400" },
  { value: "under_contract", label: "Contract", color: "border-teal-400", bg: "bg-teal-50", dot: "bg-teal-400" },
  { value: "closed", label: "Closed", color: "border-emerald-400", bg: "bg-emerald-50", dot: "bg-emerald-400" },
] as const;

interface Props {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

function formatTimeAgo(date: string) {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function LeadPipeline({ leads, onSelectLead, onUpdateStatus }: Props) {
  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const stage of PIPELINE_STAGES) map[stage.value] = [];
    for (const lead of leads) {
      if (map[lead.status]) map[lead.status].push(lead);
    }
    return map;
  }, [leads]);

  return (
    <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map((stage) => {
        const stageLeads = leadsByStage[stage.value] || [];
        return (
          <div
            key={stage.value}
            className="min-w-[260px] flex-shrink-0 md:min-w-[280px]"
          >
            {/* Column header */}
            <div
              className={`mb-3 flex items-center justify-between rounded-lg border-l-4 ${stage.color} bg-white px-4 py-3`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
                <span className="text-sm font-semibold text-gray-900">
                  {stage.label}
                </span>
              </div>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {stageLeads.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {stageLeads.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
                  <p className="text-xs text-gray-400">No leads</p>
                </div>
              ) : (
                stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className={`group cursor-pointer rounded-lg border bg-white p-4 shadow-sm transition-all hover:border-brand-200 hover:shadow-md ${
                      !lead.is_read
                        ? "border-l-4 border-l-brand-400 border-t border-r border-b border-gray-200"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {!lead.is_read && (
                            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
                          )}
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {lead.name}
                          </p>
                          {lead.auto_reply_draft && (
                            <Sparkles className="h-3 w-3 flex-shrink-0 text-brand-500" />
                          )}
                        </div>
                        {lead.listing && (
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500">
                            <Home className="h-3 w-3 flex-shrink-0" />
                            {lead.listing.street}
                          </p>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(lead.created_at)}
                      </span>
                    </div>

                    {lead.message && (
                      <p className="mt-2 line-clamp-2 text-xs text-gray-500">
                        {lead.message}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-2">
                      {lead.email && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Mail className="h-3 w-3" />
                        </span>
                      )}
                      {lead.phone && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Phone className="h-3 w-3" />
                          {formatPhone(lead.phone)}
                        </span>
                      )}
                      <div className="flex-1" />
                      {/* Quick status change - move to next stage */}
                      <div
                        className="relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            onUpdateStatus(lead.id, e.target.value)
                          }
                          className="appearance-none rounded-md border border-gray-200 bg-gray-50 py-0.5 pl-2 pr-5 text-[10px] font-medium text-gray-600 transition-colors hover:bg-gray-100"
                        >
                          {PIPELINE_STAGES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                          <option value="lost">Lost</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
