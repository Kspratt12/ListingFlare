"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Eye,
  Users,
  Calendar,
  MessageCircle,
  Clock,
  Home,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { formatPhone } from "@/lib/formatters";
import ContactButtons from "@/components/ContactButtons";

interface PortalData {
  ok: boolean;
  sellerName: string | null;
  listing: {
    id: string;
    slug: string | null;
    street: string;
    city: string;
    state: string;
    zip: string;
    price: number;
    beds: number;
    baths: number;
    sqft: number;
    photos: Array<{ src: string; alt?: string }>;
    status: string;
  };
  agent: {
    name: string;
    email: string;
    phone: string;
    brokerage: string | null;
    headshotUrl: string | null;
  } | null;
  stats: {
    views: number;
    leads: number;
    showings: number;
    chats: number;
    daysOnMarket: number;
  };
  activity: Array<{ type: string; when: string; label: string }>;
  upcomingShowings: Array<{ date: string; time: string }>;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function SellerPortalPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/seller-portal/${token}/data`);
        if (!res.ok) {
          setError("This dashboard link is invalid or has been deactivated.");
          return;
        }
        const json = await res.json();
        if (active) setData(json);
      } catch {
        setError("Couldn't load your dashboard. Please try again.");
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [token]);

  const heroPhoto = useMemo(() => {
    if (!data?.listing.photos || data.listing.photos.length === 0) return null;
    return data.listing.photos[0].src;
  }, [data]);

  const greeting = useMemo(() => {
    if (typeof window === "undefined") return "Welcome";
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-2xl font-bold text-gray-900">Dashboard unavailable</h1>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const { listing, agent, stats, activity, upcomingShowings, sellerName } = data;
  const address = `${listing.street}, ${listing.city}, ${listing.state}`;
  const firstName = sellerName ? sellerName.split(/\s+/)[0] : null;
  const listingUrl = listing.slug ? `/listing/${listing.slug}` : `/listing/${listing.id}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero */}
      <div
        className="relative overflow-hidden bg-gray-900"
        style={{
          backgroundImage: heroPhoto ? `url(${heroPhoto})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/70 via-gray-950/60 to-gray-950/90" />
        <div className="relative mx-auto max-w-5xl px-6 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
              Your Listing Dashboard
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold text-white md:text-5xl">
              {greeting}{firstName ? `, ${firstName}` : ""}.
            </h1>
            <p className="mt-3 text-lg text-gray-200 md:text-xl">
              Here&apos;s how <span className="font-semibold text-white">{listing.street}</span> is performing.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-gray-300">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
                <Home className="h-3.5 w-3.5" />
                {listing.beds} bd · {listing.baths} ba · {listing.sqft?.toLocaleString()} sqft
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
                <Clock className="h-3.5 w-3.5" />
                {stats.daysOnMarket} {stats.daysOnMarket === 1 ? "day" : "days"} on market
              </span>
              <a
                href={listingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1 font-medium text-white transition-colors hover:bg-brand-600"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View my listing page
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mx-auto max-w-5xl px-6 py-10 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatCard
            icon={Eye}
            label="Page views"
            value={stats.views.toLocaleString()}
            accent="from-brand-500/20 to-brand-500/5"
            iconColor="text-brand-600"
          />
          <StatCard
            icon={Users}
            label="Buyer inquiries"
            value={stats.leads.toLocaleString()}
            accent="from-emerald-500/20 to-emerald-500/5"
            iconColor="text-emerald-600"
          />
          <StatCard
            icon={Calendar}
            label="Showings booked"
            value={stats.showings.toLocaleString()}
            accent="from-orange-500/20 to-orange-500/5"
            iconColor="text-orange-600"
          />
          <StatCard
            icon={MessageCircle}
            label="AI chats"
            value={stats.chats.toLocaleString()}
            accent="from-purple-500/20 to-purple-500/5"
            iconColor="text-purple-600"
          />
        </motion.div>

        {/* Activity + Upcoming */}
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {/* Activity timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6"
          >
            <h2 className="font-serif text-lg font-semibold text-gray-900">Recent activity</h2>
            <p className="mt-1 text-xs text-gray-500">
              Real-time updates as buyers engage with your listing.
            </p>
            {activity.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                <p className="text-sm text-gray-500">
                  No activity yet. Once buyers start viewing and inquiring, you&apos;ll see it here.
                </p>
              </div>
            ) : (
              <ol className="mt-4 space-y-3">
                {activity.map((event, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                    <div
                      className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                        event.type === "lead"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-orange-100 text-orange-600"
                      }`}
                    >
                      {event.type === "lead" ? <Users className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{event.label}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{formatRelative(event.when)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </motion.div>

          {/* Upcoming showings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="rounded-2xl border border-gray-200 bg-white p-6"
          >
            <h2 className="font-serif text-lg font-semibold text-gray-900">Upcoming showings</h2>
            {upcomingShowings.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                No showings scheduled yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {upcomingShowings.map((s, i) => (
                  <li key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(s.date + "T12:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">{s.time}</p>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>

        {/* Agent card */}
        {agent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6 md:p-8"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
              Your Agent
            </p>
            <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-center md:gap-6">
              {agent.headshotUrl ? (
                <img
                  src={agent.headshotUrl}
                  alt={agent.name}
                  className="h-20 w-20 flex-shrink-0 rounded-full border-2 border-brand-400/30 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-2xl font-bold text-white">
                  {agent.name?.[0]?.toUpperCase() || "A"}
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-serif text-xl font-semibold text-white">{agent.name}</h3>
                {agent.brokerage && (
                  <p className="mt-0.5 text-sm text-gray-400">{agent.brokerage}</p>
                )}
                <div className="mt-2 space-y-1 text-sm text-gray-300">
                  {agent.phone && <p>{formatPhone(agent.phone)}</p>}
                  {agent.email && <p className="truncate">{agent.email}</p>}
                </div>
              </div>
              <div className="md:self-center">
                <ContactButtons
                  phone={agent.phone}
                  email={agent.email}
                  smsBody={`Hi ${agent.name?.split(" ")[0] || "there"}, quick question about ${address}.`}
                  emailSubject={`Question about ${listing.street}`}
                  showLabels
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <div className="mt-12 border-t border-gray-200 pt-6 text-center">
          <p className="text-xs text-gray-400">
            Powered by <span className="font-serif text-brand-500">ListingFlare</span>. Your dashboard updates in real time whenever you open this page.
          </p>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
  iconColor: string;
}

function StatCard({ icon: Icon, label, value, accent, iconColor }: StatCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5`}>
      <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${accent} blur-2xl`} />
      <div className="relative">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      </div>
    </div>
  );
}
