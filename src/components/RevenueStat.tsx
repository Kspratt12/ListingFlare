"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trophy, TrendingUp } from "lucide-react";

interface Stats {
  ytdCommission: number;
  closedDeals: number;
  totalLeads: number;
  subscriptionCost: number;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function RevenueStat() {
  const [stats, setStats] = useState<Stats | null>(null);
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

      const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();

      const [{ data: closed }, { count: totalLeads }] = await Promise.all([
        supabase
          .from("leads")
          .select("commission_amount, closed_at")
          .eq("agent_id", user.id)
          .eq("status", "closed")
          .gte("closed_at", startOfYear)
          .not("commission_amount", "is", null),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("agent_id", user.id),
      ]);

      const ytdCommission = (closed || []).reduce(
        (sum, l) => sum + (l.commission_amount || 0),
        0
      );
      const closedDeals = (closed || []).length;

      if (active) {
        setStats({
          ytdCommission,
          closedDeals,
          totalLeads: totalLeads || 0,
          subscriptionCost: 150,
        });
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-gradient-to-br from-emerald-50 to-white p-5">
        <div className="h-20 animate-pulse rounded-lg bg-gray-100" />
      </div>
    );
  }

  if (!stats || stats.ytdCommission === 0) {
    // Don't show an awkward $0 card. Hide until first closed deal.
    return null;
  }

  const monthsActive = Math.max(1, new Date().getMonth() + 1);
  const totalSpent = monthsActive * stats.subscriptionCost;
  const roiMultiple = Math.round(stats.ytdCommission / totalSpent);

  return (
    <div className="flex h-full flex-col rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-emerald-600" />
        <h3 className="text-sm font-semibold text-gray-900">YTD Earnings</h3>
        <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
          via ListingFlare
        </span>
      </div>

      <div className="mt-3">
        <p className="font-serif text-3xl font-bold text-gray-900 md:text-4xl">
          {formatMoney(stats.ytdCommission)}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          from {stats.closedDeals} closed deal{stats.closedDeals !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2">
        <TrendingUp className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
        <p className="text-xs font-medium text-emerald-800">
          <span className="font-bold">{roiMultiple}&times;</span> return on your{" "}
          {formatMoney(totalSpent)} investment
        </p>
      </div>
    </div>
  );
}
