"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  CheckCircle2,
  Circle,
  Rocket,
  ArrowRight,
  Home,
  Share2,
  Users,
  Calendar,
  Sparkles,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  icon: typeof Home;
  done: boolean;
  action?: { label: string; href: string; external?: boolean };
}

export default function GettingStarted() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [profileResult, listingsResult, leadsResult, showingsResult] = await Promise.all([
        supabase
          .from("agent_profiles")
          .select("name, phone, brokerage, headshot_url, google_access_token")
          .eq("id", user.id)
          .single(),
        supabase
          .from("listings")
          .select("id, slug, status")
          .eq("agent_id", user.id)
          .eq("status", "published")
          .limit(1),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("agent_id", user.id),
        supabase
          .from("showings")
          .select("id", { count: "exact", head: true })
          .eq("agent_id", user.id),
      ]);

      const profile = profileResult.data;
      const firstListing = listingsResult.data?.[0];

      const profileComplete = Boolean(
        profile?.name && profile?.phone && (profile?.brokerage || profile?.headshot_url)
      );
      const hasPublishedListing = Boolean(firstListing);
      const hasLead = (leadsResult.count || 0) > 0;
      const hasShowing = (showingsResult.count || 0) > 0;
      const googleConnected = Boolean(profile?.google_access_token);

      const computed: Task[] = [
        {
          id: "profile",
          title: "Complete your agent profile",
          description: "Name, phone, brokerage, and headshot help build trust with buyers.",
          icon: Sparkles,
          done: profileComplete,
          action: profileComplete ? undefined : { label: "Edit Profile", href: "/dashboard/settings" },
        },
        {
          id: "listing",
          title: "Publish your first listing",
          description: "Your listing becomes its own branded page with AI chat and showing booking.",
          icon: Home,
          done: hasPublishedListing,
          action: hasPublishedListing
            ? { label: "View Listing", href: firstListing?.slug ? `/listing/${firstListing.slug}` : `/listing/${firstListing?.id || ""}`, external: true }
            : { label: "Create Listing", href: "/dashboard/create" },
        },
        {
          id: "share",
          title: "Share your listing URL",
          description: "Drop the link in your Zillow bio, Instagram, email signature, text blasts, or on a sign rider.",
          icon: Share2,
          done: hasLead,
          action: { label: "See My Listings", href: "/dashboard" },
        },
        {
          id: "lead",
          title: "Capture your first buyer inquiry",
          description: "When a buyer fills out the form or chats with your AI, they show up here.",
          icon: Users,
          done: hasLead,
          action: hasLead ? { label: "View Leads", href: "/dashboard/leads" } : undefined,
        },
        {
          id: "showing",
          title: "Book your first showing",
          description: "Buyers pick a date/time from your listing page. Instant confirmations to both of you.",
          icon: Calendar,
          done: hasShowing,
          action: hasShowing ? { label: "View Showings", href: "/dashboard/showings" } : undefined,
        },
        {
          id: "google",
          title: "Connect Google Calendar (optional)",
          description: "Booked showings auto-create calendar events. Never double-book.",
          icon: Calendar,
          done: googleConnected,
          action: googleConnected
            ? undefined
            : { label: "Connect", href: "/dashboard/settings" },
        },
      ];

      if (active) setTasks(computed);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  if (!tasks || dismissed) return null;

  const completedCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;
  const pct = Math.round((completedCount / totalCount) * 100);

  // Hide once fully complete
  if (completedCount === totalCount) return null;

  return (
    <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-brand-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-brand-500" />
            <h3 className="text-sm font-semibold text-gray-900">Getting Started</h3>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {completedCount} of {totalCount} complete · Finish these to unlock your first deal
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-brand-100 sm:w-32">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-brand-700">{pct}%</span>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="text-[11px] text-gray-400 hover:text-gray-600"
            aria-label="Dismiss getting started"
          >
            Hide
          </button>
        </div>
      </div>

      {/* Checklist */}
      <ol className="divide-y divide-brand-100">
        {tasks.map((task) => {
          const Icon = task.icon;
          return (
            <li
              key={task.id}
              className={`flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center ${
                task.done ? "bg-white/40" : "hover:bg-white/70"
              }`}
            >
              {/* Check/Circle */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0 pt-0.5">
                  {task.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`h-3.5 w-3.5 flex-shrink-0 ${
                        task.done ? "text-gray-400" : "text-brand-500"
                      }`}
                    />
                    <p
                      className={`text-sm font-medium ${
                        task.done ? "text-gray-400 line-through" : "text-gray-900"
                      }`}
                    >
                      {task.title}
                    </p>
                  </div>
                  <p
                    className={`mt-0.5 text-xs ${
                      task.done ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {task.description}
                  </p>
                </div>
              </div>

              {/* Action button */}
              {task.action && (
                <div className="flex-shrink-0 sm:ml-4">
                  {task.action.external ? (
                    <a
                      href={task.action.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:w-auto ${
                        task.done
                          ? "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          : "bg-gray-950 text-white hover:bg-gray-800"
                      }`}
                    >
                      {task.action.label}
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  ) : (
                    <Link
                      href={task.action.href}
                      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:w-auto ${
                        task.done
                          ? "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          : "bg-gray-950 text-white hover:bg-gray-800"
                      }`}
                    >
                      {task.action.label}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
