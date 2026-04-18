"use client";

import { Flame, Snowflake, TrendingUp } from "lucide-react";
import type { HotTier } from "@/lib/hotScore";

interface Props {
  tier: HotTier;
  score?: number;
  showLabel?: boolean;
  compact?: boolean;
}

const STYLES: Record<HotTier, { label: string; bg: string; text: string; icon: typeof Flame }> = {
  hot: {
    label: "Hot",
    bg: "bg-red-50 border-red-200",
    text: "text-red-700",
    icon: Flame,
  },
  warm: {
    label: "Warm",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    icon: TrendingUp,
  },
  cold: {
    label: "Cold",
    bg: "bg-gray-50 border-gray-200",
    text: "text-gray-500",
    icon: Snowflake,
  },
};

export default function HotLeadBadge({ tier, score, showLabel = true, compact = false }: Props) {
  const style = STYLES[tier];
  const Icon = style.icon;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 rounded-full border ${style.bg} px-1.5 py-0.5 text-[10px] font-semibold ${style.text}`}
        title={`${style.label}${score ? ` · ${score}` : ""}`}
      >
        <Icon className="h-2.5 w-2.5" />
        {showLabel && style.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${style.bg} px-2 py-0.5 text-[11px] font-semibold ${style.text}`}
    >
      <Icon className="h-3 w-3" />
      {showLabel && style.label}
      {score !== undefined && score > 0 && (
        <span className="ml-0.5 opacity-70">· {score}</span>
      )}
    </span>
  );
}
