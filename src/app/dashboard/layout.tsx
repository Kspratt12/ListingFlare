"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSubscriptionLimits } from "@/lib/subscription";
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
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "My Listings", icon: LayoutGrid },
  { href: "/dashboard/create", label: "New Listing", icon: PlusCircle },
  { href: "/dashboard/leads", label: "Leads", icon: MessageSquare },
  { href: "/dashboard/showings", label: "Showings", icon: CalendarDays },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/assistant", label: "AI Assistant", icon: Bot },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const limits = getSubscriptionLimits(profile);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("agent_profiles").select("*").eq("id", user.id).single()
          .then(({ data }) => { if (data) setProfile(data as AgentProfile); });
      }
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-6 py-6">
        <Link href="/" className="font-serif text-xl font-bold text-white">
          Listing<span className="text-brand-400">Flare</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="mt-4 flex-1 px-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(item.href)
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 px-3 py-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col bg-gray-950 lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gray-950 transition-transform duration-300 lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute right-3 top-5 p-1 text-gray-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent />
      </aside>

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
            Listing<span className="text-brand-400">Flare</span>
          </span>
        </header>

        {/* Trial banner */}
        {profile && limits.isTrialing && !bannerDismissed && (
          <div className="flex items-center justify-between gap-3 border-b-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-2.5 sm:px-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 flex-shrink-0 text-emerald-600" />
              <p className="text-sm text-emerald-900">
                <span className="font-semibold">Free trial</span>: {limits.trialDaysLeft} day{limits.trialDaysLeft !== 1 ? "s" : ""} left.
                Upgrade for unlimited listings, videos, lead replies & more.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/billing"
                className="flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 whitespace-nowrap"
              >
                Upgrade Now <ArrowRight className="h-3 w-3" />
              </Link>
              <button
                onClick={() => setBannerDismissed(true)}
                aria-label="Dismiss trial banner"
                className="rounded p-1 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
      <LiveLeadAlerts />
      <CommandPalette />
    </div>
  );
}
