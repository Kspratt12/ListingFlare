"use client";

import type { Lead } from "@/lib/types";
import { DollarSign, Clock, UserCheck, Globe } from "lucide-react";

interface Props {
  lead: Lead;
}

const PRE_APPROVED_LABEL: Record<string, { label: string; color: string }> = {
  yes: { label: "Pre-approved", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cash: { label: "Cash buyer", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  working_on_it: { label: "Working on pre-approval", color: "bg-amber-50 text-amber-700 border-amber-200" },
  no: { label: "Not pre-approved", color: "bg-gray-50 text-gray-600 border-gray-200" },
  not_specified: { label: "Pre-approval: unknown", color: "bg-gray-50 text-gray-500 border-gray-200" },
};

const TIMELINE_LABEL: Record<string, { label: string; color: string }> = {
  asap: { label: "ASAP (under 30 days)", color: "bg-red-50 text-red-700 border-red-200" },
  "30_90": { label: "30-90 days", color: "bg-amber-50 text-amber-700 border-amber-200" },
  "3_6_months": { label: "3-6 months", color: "bg-blue-50 text-blue-700 border-blue-200" },
  just_looking: { label: "Just exploring", color: "bg-gray-50 text-gray-600 border-gray-200" },
  not_specified: { label: "Timeline: unknown", color: "bg-gray-50 text-gray-500 border-gray-200" },
};

const AGENT_LABEL: Record<string, { label: string; color: string }> = {
  no: { label: "Unrepresented", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  yes: { label: "Has another agent", color: "bg-gray-50 text-gray-600 border-gray-200" },
  not_specified: { label: "Agent status: unknown", color: "bg-gray-50 text-gray-500 border-gray-200" },
};

function formatSource(source: string): string {
  const s = source.toLowerCase();
  if (s === "direct") return "Direct";
  if (s === "instagram") return "Instagram";
  if (s === "facebook") return "Facebook";
  if (s === "zillow") return "Zillow";
  if (s === "realtor") return "Realtor.com";
  if (s === "google") return "Google";
  if (s === "tiktok") return "TikTok";
  if (s === "linkedin") return "LinkedIn";
  if (s === "twitter") return "Twitter / X";
  if (s === "qr") return "QR Code";
  if (s === "email") return "Email";
  if (s === "sms") return "SMS / Text";
  if (s === "open_house") return "Open House";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function LeadIntel({ lead }: Props) {
  const hasIntel =
    (lead.pre_approved && lead.pre_approved !== "not_specified") ||
    (lead.timeline && lead.timeline !== "not_specified") ||
    (lead.has_agent && lead.has_agent !== "not_specified") ||
    lead.source;

  if (!hasIntel) return null;

  const preApproved = lead.pre_approved ? PRE_APPROVED_LABEL[lead.pre_approved] : null;
  const timeline = lead.timeline ? TIMELINE_LABEL[lead.timeline] : null;
  const agentStatus = lead.has_agent ? AGENT_LABEL[lead.has_agent] : null;

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        Buyer Intel
      </p>
      <div className="flex flex-wrap gap-1.5">
        {preApproved && lead.pre_approved !== "not_specified" && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${preApproved.color}`}
          >
            <DollarSign className="h-2.5 w-2.5" />
            {preApproved.label}
          </span>
        )}
        {timeline && lead.timeline !== "not_specified" && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${timeline.color}`}
          >
            <Clock className="h-2.5 w-2.5" />
            {timeline.label}
          </span>
        )}
        {agentStatus && lead.has_agent !== "not_specified" && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${agentStatus.color}`}
          >
            <UserCheck className="h-2.5 w-2.5" />
            {agentStatus.label}
          </span>
        )}
        {lead.source && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600"
            title="Where this lead came from"
          >
            <Globe className="h-2.5 w-2.5" />
            {formatSource(lead.source)}
          </span>
        )}
      </div>
    </div>
  );
}
