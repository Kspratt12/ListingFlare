"use client";

import { useEffect, useState } from "react";
import { Zap, TrendingDown } from "lucide-react";

interface Stats {
  avgSeconds: number | null;
  industryAvgSeconds: number;
  count: number;
  fastestSeconds?: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

export default function SpeedToLead() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/dashboard/speed")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setStats(data);
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
      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-brand-50 to-white p-5">
        <div className="h-20 animate-pulse rounded-lg bg-gray-100" />
      </div>
    );
  }

  if (!stats || stats.count === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-brand-50 to-white p-5">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-brand-500" />
          <h3 className="text-sm font-semibold text-gray-900">Speed to Lead</h3>
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Your first lead response will unlock this metric. Industry avg: <span className="font-semibold text-gray-700">47 minutes</span>.
        </p>
      </div>
    );
  }

  const avg = stats.avgSeconds!;
  const fasterBy = stats.industryAvgSeconds - avg;
  const timesFaster = Math.round(stats.industryAvgSeconds / Math.max(avg, 1));

  return (
    <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-brand-50 to-white p-5">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-brand-500" />
        <h3 className="text-sm font-semibold text-gray-900">Speed to Lead</h3>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <p className="font-serif text-3xl font-bold text-gray-900 md:text-4xl">
          {formatDuration(avg)}
        </p>
        <p className="text-xs text-gray-500">avg response</p>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2">
        <TrendingDown className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
        <p className="text-xs font-medium text-emerald-800">
          {fasterBy > 0 ? (
            <>
              {timesFaster}× faster than industry avg ({formatDuration(stats.industryAvgSeconds)})
            </>
          ) : (
            <>On pace with industry benchmark</>
          )}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
        <span>Based on {stats.count} lead{stats.count !== 1 ? "s" : ""}</span>
        {stats.fastestSeconds !== undefined && (
          <span>
            Fastest:{" "}
            <span className="font-semibold text-gray-700">
              {formatDuration(stats.fastestSeconds)}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
