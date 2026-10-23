"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSubscriptionLimits } from "@/lib/subscription";
import { clearUserStorage } from "@/lib/userStorage";
import { AgentSessionContext, getLocalUserId, resetLocalUserId } from "@/lib/agentSession";
import { clearCache, setCacheOwner } from "@/lib/swrCache";
import type { AgentProfile } from "@/lib/types";
import LiveLeadAlerts from "@/components/LiveLeadAlerts";
import CommandPalette from "@/components/CommandPalette";
import {
  LayoutGrid,
  PlusCircle,
  MessageSquare,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  Sparkles,
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  Home,
  Palette,
  ChevronDown,
  Handshake,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "My Listings", icon: LayoutGrid },
  { href: "/dashboard/create", label: "New Listing", icon: PlusCircle },
  { href: "/dashboard/leads", label: "Leads", icon: MessageSquare },
  { href: "/dashboard/showings", label: "Showings", icon: CalendarDays },
  { href: "/dashboard/offers", label: "Offers", icon: Handshake },
  { href: "/dashboard/seller-prospects", label: "Seller Prospects", icon: Home },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/assistant", label: "AI Assistant", icon: Bot },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface SidebarContentProps {
  pathname: string;
  profile: AgentProfile | null;
  setProfile: Dispatch<SetStateAction<AgentProfile | null>>;
  themeOpen: boolean;
  setThemeOpen: Dispatch<SetStateAction<boolean>>;
  onNavigate: () => void;
  onLogout: () => void;
  unreadLeads: number;
}

// Module-level so its identity is stable across layout re-renders
// (an inline component would remount the whole sidebar every render).
function SidebarContent({ pathname, profile, setProfile, themeOpen, setThemeOpen, onNavigate, onLogout, unreadLeads }: SidebarContentProps) {
  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Logo */}
      <div className="px-6 py-6">
        <Link href="/" className="font-serif text-xl font-bold text-white">
          Listing
          <span style={{ color: "color-mix(in srgb, var(--agent-brand, #b8965a) 55%, white)" }}>
            Flare
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="mt-4 flex-1 px-3">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={() => onNavigate()}
              className={`group relative mb-1 flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
              style={
                active
                  ? { backgroundColor: "color-mix(in srgb, var(--agent-brand, #b8965a) 38%, transparent)" }
                  : undefined
              }
            >
              {/* Left accent bar on active item */}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full"
                  style={{ backgroundColor: "var(--agent-brand, #b8965a)" }}
                />
              )}
              <item.icon
                className="h-5 w-5 transition-colors"
                style={active ? { color: "var(--agent-brand, #b8965a)" } : undefined}
              />
              {item.label}
              {item.href === "/dashboard/leads" && unreadLeads > 0 && (
                <span
                  aria-label={`${unreadLeads} new leads`}
                  className="ml-auto min-w-[1.25rem] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white"
                >
                  {unreadLeads > 99 ? "99+" : unreadLeads}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 px-3 py-4">
        {/* Collapsible theme picker. Defaults to closed so it's not an
            eyesore after the agent has picked their color - just a
            thin "Theme" row with the current swatch. Clicking expands
            to show all 8 choices. */}
        {profile && (
          <div className="mb-2">
            <button
              type="button"
              onClick={() => setThemeOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              aria-expanded={themeOpen}
            >
              <span className="flex items-center gap-3">
                <Palette className="h-5 w-5" />
                <span>Theme</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-3.5 w-3.5 rounded-full border border-white/40"
                  style={{ backgroundColor: profile.brand_color || "#b8965a" }}
                />
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${themeOpen ? "rotate-180" : ""}`}
                />
              </span>
            </button>
            {themeOpen && (
              <div className="mt-2 flex flex-wrap gap-1.5 px-3 pb-1">
                {["#b8965a", "#0f172a", "#0ea5e9", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={async () => {
                      document.documentElement.style.setProperty("--agent-brand", c);
                      setProfile((p) => (p ? { ...p, brand_color: c } : p));
                      setThemeOpen(false); // auto-collapse after picking — they saw the color apply, no need to stare at swatches
                      const supabase = createClient();
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        await supabase.from("agent_profiles").update({ brand_color: c }).eq("id", user.id);
                      }
                    }}
                    aria-label={`Theme color ${c}`}
                    title={c}
                    style={{ backgroundColor: c }}
                    className={`h-5 w-5 rounded-full border transition-transform hover:scale-125 ${
                      (profile?.brand_color || "#b8965a").toLowerCase() === c.toLowerCase()
                        ? "border-white ring-1 ring-white"
                        : "border-white/30"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false); // collapsed by default so the picker isn't visual clutter
  const limits = getSubscriptionLimits(profile);
  const [unreadLeads, setUnreadLeads] = useState(0);

  // "New" lead count for the sidebar badge. Uses the same criteria as the
  // "New" filter on the leads page (status = "new") so the two always match.
  // A head-only count query (no rows
  // transferred), refreshed on navigation and every minute. The leads page
  // pushes exact updates through the "lf:unread-leads" event.
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const refresh = async () => {
      const uid = await getLocalUserId();
      if (!uid || !active) return;
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", uid)
        .eq("status", "new");
      if (active && count !== null) setUnreadLeads(count);
    };
    refresh();
    const timer = setInterval(refresh, 60000);
    const onPush = (e: Event) => setUnreadLeads((e as CustomEvent<number>).detail);
    window.addEventListener("lf:unread-leads", onPush);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("lf:unread-leads", onPush);
    };
  }, [pathname]);

  useEffect(() => {
    // Load the user ID (local session read) and profile once. Every tab
    // reads them from context instead of refetching.
    const supabase = createClient();
    let active = true;
    getLocalUserId().then((uid) => {
      if (!uid || !active) return;
      setCacheOwner(uid);
      setUserId(uid);
      // Retry once on failure so a transient error doesn't leave a paying
      // client without a profile (which would look like a locked account).
      const loadProfile = async (attempt: number): Promise<void> => {
        const { data, error } = await supabase.from("agent_profiles").select("*").eq("id", uid).single();
        if (!active) return;
        if (data) setProfile(data as AgentProfile);
        else if (error && attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000));
          if (active) await loadProfile(attempt + 1);
        }
      };
      loadProfile(0);
    });
    return () => {
      active = false;
    };
  }, []);

  // Restore the saved brand color synchronously before paint on every
  // mount — covers the SPA-navigation case where the root <head> inline
  // script only runs on full page loads. Without this, navigating from
  // e.g. the demo page (which clears the variable on unmount) back into
  // the dashboard would flash gold before the profile-based effect fires.
  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    try {
      const cached = localStorage.getItem("listingflare:brand-color");
      if (cached) {
        document.documentElement.style.setProperty("--agent-brand", cached);
      }
    } catch {
      // private-mode / quota — ignore
    }
  }, []);

  // Keep the --agent-brand CSS variable in sync with whatever's loaded from
  // the profile. Only runs when the profile has actually loaded — while
  // loading, we leave whatever the useLayoutEffect above or the inline
  // root-script restored from localStorage. That avoids the gold-flash.
  // Also persist the current choice to localStorage for next visit.
  useEffect(() => {
    if (typeof document === "undefined" || !profile) return;
    const color = profile.brand_color || "#b8965a";
    document.documentElement.style.setProperty("--agent-brand", color);
    try {
      localStorage.setItem("listingflare:brand-color", color);
    } catch {
      // private-mode / quota — ignore
    }
  }, [profile]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearUserStorage();
    clearCache();
    resetLocalUserId();
    // Clear the per-browser brand-color cache so the next user who signs
    // in on this device doesn't briefly see the previous user's theme.
    try {
      localStorage.removeItem("listingflare:brand-color");
      document.documentElement.style.removeProperty("--agent-brand");
    } catch {
      // ignore
    }
    router.push("/login");
    router.refresh();
  };

  const sidebarProps: SidebarContentProps = {
    pathname,
    profile,
    setProfile,
    themeOpen,
    setThemeOpen,
    onNavigate: () => setSidebarOpen(false),
    onLogout: handleLogout,
    unreadLeads,
  };

  return (
    <AgentSessionContext.Provider value={{ userId, profile, setProfile }}>
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside
        className="hidden w-64 flex-col lg:flex"
        style={{
          background: `linear-gradient(180deg, color-mix(in srgb, var(--agent-brand, #b8965a) 22%, #0a0a0a) 0%, color-mix(in srgb, var(--agent-brand, #b8965a) 12%, #0a0a0a) 45%, color-mix(in srgb, var(--agent-brand, #b8965a) 8%, #0a0a0a) 75%, color-mix(in srgb, var(--agent-brand, #b8965a) 14%, #0a0a0a) 100%)`,
        }}
      >
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile sidebar: mounted only while open */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 flex w-64 animate-sidebar-in flex-col lg:hidden"
            style={{
              background: `linear-gradient(180deg, color-mix(in srgb, var(--agent-brand, #b8965a) 22%, #0a0a0a) 0%, color-mix(in srgb, var(--agent-brand, #b8965a) 12%, #0a0a0a) 45%, color-mix(in srgb, var(--agent-brand, #b8965a) 8%, #0a0a0a) 75%, color-mix(in srgb, var(--agent-brand, #b8965a) 14%, #0a0a0a) 100%)`,
            }}
          >
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-5 p-1 text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent {...sidebarProps} />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-serif text-lg font-bold text-gray-900">
            Listing<span style={{ color: "color-mix(in srgb, var(--agent-brand, #b8965a) 55%, white)" }}>Flare</span>
          </span>
        </header>

        {/* Trial banner - urgency styling at 3 days or less */}
        {profile && limits.isTrialing && !bannerDismissed && (
          <div
            className={`flex flex-wrap items-center justify-between gap-2 border-b-2 px-4 py-2 sm:px-6 sm:py-2.5 ${
              limits.trialDaysLeft <= 3
                ? "border-red-400 bg-gradient-to-r from-red-50 to-red-100"
                : "border-emerald-300 bg-gradient-to-r from-emerald-50 to-emerald-100"
            }`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Sparkles
                className={`h-4 w-4 flex-shrink-0 ${
                  limits.trialDaysLeft <= 3 ? "text-red-600" : "text-emerald-600"
                }`}
              />
              <p
                className={`min-w-0 truncate text-xs sm:text-sm ${
                  limits.trialDaysLeft <= 3 ? "text-red-900" : "text-emerald-900"
                }`}
              >
                <span className="font-semibold">
                  {limits.trialDaysLeft === 0
                    ? "Trial ending today"
                    : limits.trialDaysLeft <= 3
                      ? `Only ${limits.trialDaysLeft} day${limits.trialDaysLeft !== 1 ? "s" : ""} left`
                      : `Free trial: ${limits.trialDaysLeft} days left`}
                </span>
                <span className="hidden sm:inline">
                  {limits.trialDaysLeft > 3
                    ? ". Upgrade for unlimited listings, videos, lead replies & more."
                    : ". Upgrade to keep your listings active."}
                </span>
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              <Link
                href="/dashboard/billing"
                prefetch={true}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold text-white whitespace-nowrap sm:px-4 sm:py-1.5 sm:text-xs ${
                  limits.trialDaysLeft <= 3
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                Upgrade <ArrowRight className="h-3 w-3" />
              </Link>
              <button
                onClick={() => setBannerDismissed(true)}
                aria-label="Dismiss trial banner"
                className={`rounded p-1 ${
                  limits.trialDaysLeft <= 3
                    ? "text-red-700 hover:bg-red-200 hover:text-red-900"
                    : "text-emerald-700 hover:bg-emerald-200 hover:text-emerald-900"
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Page content - agent-brand-override lets every brand-tinted
            widget inside the dashboard (Activity feed buttons, phone
            alerts, Speed to Lead, Upcoming Showings, etc.) pick up the
            agent's chosen theme color via the CSS variable. */}
        <main className="agent-brand-override flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
      <LiveLeadAlerts />
      <CommandPalette />
    </div>
    </AgentSessionContext.Provider>
  );
}
