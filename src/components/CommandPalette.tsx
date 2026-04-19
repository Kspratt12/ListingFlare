"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  LayoutGrid,
  PlusCircle,
  MessageSquare,
  CalendarDays,
  BarChart3,
  Bot,
  CreditCard,
  Settings,
  Home,
  User,
  ExternalLink,
} from "lucide-react";

interface Command {
  id: string;
  type: "action" | "listing" | "lead" | "showing";
  title: string;
  subtitle?: string;
  icon: typeof Search;
  onSelect: () => void;
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [commands, setCommands] = useState<Command[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const staticActions: Command[] = [
    {
      id: "action-listings",
      type: "action",
      title: "Go to My Listings",
      icon: LayoutGrid,
      onSelect: () => router.push("/dashboard"),
    },
    {
      id: "action-create",
      type: "action",
      title: "Create New Listing",
      icon: PlusCircle,
      onSelect: () => router.push("/dashboard/create"),
    },
    {
      id: "action-leads",
      type: "action",
      title: "Go to Leads",
      icon: MessageSquare,
      onSelect: () => router.push("/dashboard/leads"),
    },
    {
      id: "action-showings",
      type: "action",
      title: "Go to Showings",
      icon: CalendarDays,
      onSelect: () => router.push("/dashboard/showings"),
    },
    {
      id: "action-analytics",
      type: "action",
      title: "View Analytics",
      icon: BarChart3,
      onSelect: () => router.push("/dashboard/analytics"),
    },
    {
      id: "action-assistant",
      type: "action",
      title: "AI Assistant",
      icon: Bot,
      onSelect: () => router.push("/dashboard/assistant"),
    },
    {
      id: "action-billing",
      type: "action",
      title: "Billing & Plan",
      icon: CreditCard,
      onSelect: () => router.push("/dashboard/billing"),
    },
    {
      id: "action-settings",
      type: "action",
      title: "Settings",
      icon: Settings,
      onSelect: () => router.push("/dashboard/settings"),
    },
  ];

  // Load listings, leads, showings for search
  const loadData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [listingsRes, leadsRes, showingsRes] = await Promise.all([
      supabase
        .from("listings")
        .select("id, slug, street, city, state")
        .eq("agent_id", user.id)
        .order("created_at", { ascending: false })
        .limit(25),
      supabase
        .from("leads")
        .select("id, name, email")
        .eq("agent_id", user.id)
        .order("created_at", { ascending: false })
        .limit(25),
      supabase
        .from("showings")
        .select("id, name, showing_date, showing_time")
        .eq("agent_id", user.id)
        .eq("status", "confirmed")
        .gte("showing_date", new Date().toISOString().split("T")[0])
        .order("showing_date", { ascending: true })
        .limit(15),
    ]);

    const dynamicCmds: Command[] = [];

    for (const l of listingsRes.data || []) {
      dynamicCmds.push({
        id: `listing-${l.id}`,
        type: "listing",
        title: l.street || "Untitled listing",
        subtitle: [l.city, l.state].filter(Boolean).join(", "),
        icon: Home,
        onSelect: () => router.push(`/dashboard/edit/${l.id}`),
      });
    }

    for (const lead of leadsRes.data || []) {
      dynamicCmds.push({
        id: `lead-${lead.id}`,
        type: "lead",
        title: lead.name || "Lead",
        subtitle: lead.email || "",
        icon: User,
        onSelect: () => router.push(`/dashboard/leads`),
      });
    }

    for (const s of showingsRes.data || []) {
      dynamicCmds.push({
        id: `showing-${s.id}`,
        type: "showing",
        title: `Showing: ${s.name}`,
        subtitle: `${s.showing_date} at ${s.showing_time}`,
        icon: CalendarDays,
        onSelect: () => router.push("/dashboard/showings"),
      });
    }

    setCommands([...staticActions, ...dynamicCmds]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      loadData();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, loadData]);

  const filtered = query.trim()
    ? commands.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          (c.subtitle || "").toLowerCase().includes(q)
        );
      })
    : commands;

  const visible = filtered.slice(0, 15);

  useEffect(() => {
    if (selectedIndex >= visible.length) setSelectedIndex(0);
  }, [visible.length, selectedIndex]);

  const handleKeyNav = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, visible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = visible[selectedIndex];
      if (cmd) {
        cmd.onSelect();
        setOpen(false);
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyNav}
            placeholder="Jump to listing, lead, showing, or action..."
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          <kbd className="hidden rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 sm:inline-block">
            ESC
          </kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-1">
          {visible.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            visible.map((cmd, i) => {
              const Icon = cmd.icon;
              const selected = i === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.onSelect();
                    setOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    selected ? "bg-brand-50" : "hover:bg-gray-50"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 flex-shrink-0 ${selected ? "text-brand-600" : "text-gray-400"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {cmd.title}
                    </p>
                    {cmd.subtitle && (
                      <p className="truncate text-xs text-gray-500">{cmd.subtitle}</p>
                    )}
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      cmd.type === "action"
                        ? "bg-gray-100 text-gray-600"
                        : cmd.type === "listing"
                          ? "bg-blue-50 text-blue-700"
                          : cmd.type === "lead"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-orange-50 text-orange-700"
                    }`}
                  >
                    {cmd.type}
                  </span>
                  {selected && (
                    <ExternalLink className="h-3 w-3 text-brand-500" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
          <div className="flex items-center gap-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5">↵</kbd>
              Open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5">ESC</kbd>
              Close
            </span>
            <span className="ml-auto flex items-center gap-1">
              <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5">⌘K</kbd>
              to toggle
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
