"use client";

import { useEffect, useState } from "react";
import { MessageCircle, CalendarCheck, Home } from "lucide-react";

interface Stats {
  leads: number;
  showings: number;
  listings: number;
}

export default function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats/public")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => setStats({ leads: 0, showings: 0, listings: 0 }));
  }, []);

  // Hide the section entirely until we have real data — don't show zeros that look embarrassing
  if (!stats || (stats.leads < 5 && stats.showings < 2 && stats.listings < 3)) {
    return null;
  }

  const items = [
    {
      icon: Home,
      value: stats.listings,
      label: stats.listings === 1 ? "listing live right now" : "listings live right now",
    },
    {
      icon: MessageCircle,
      value: stats.leads,
      label: stats.leads === 1 ? "buyer inquiry captured" : "buyer inquiries captured",
    },
    {
      icon: CalendarCheck,
      value: stats.showings,
      label: stats.showings === 1 ? "showing booked" : "showings booked",
    },
  ];

  return (
    <section className="border-y border-gray-100 bg-white py-10">
      <div className="mx-auto max-w-5xl px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-500">
          Real results, live
        </p>
        <div className="mt-5 grid grid-cols-3 gap-4 md:gap-8">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="flex flex-col items-center text-center"
              >
                <Icon className="h-5 w-5 text-brand-500" />
                <p className="mt-2 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
                  {item.value.toLocaleString()}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 md:text-sm">
                  {item.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
