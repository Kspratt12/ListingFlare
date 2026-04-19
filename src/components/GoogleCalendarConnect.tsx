"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle, ExternalLink } from "lucide-react";

export default function GoogleCalendarConnect() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [unconfigured, setUnconfigured] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("agent_profiles")
        .select("google_access_token")
        .eq("id", user.id)
        .single();
      if (active) setConnected(Boolean(data?.google_access_token));
    }
    load();

    // Read query string for callback confirmation
    const params = new URLSearchParams(window.location.search);
    const googleStatus = params.get("google");
    if (googleStatus === "connected") setStatus("✓ Google Calendar connected");
    else if (googleStatus === "error") setStatus("Connection cancelled");
    else if (googleStatus === "token_exchange_failed") setStatus("Token exchange failed - try again");
    else if (googleStatus === "save_failed") setStatus("Failed to save connection");
    else if (googleStatus === "unconfigured") {
      setStatus("Google integration not configured on this deployment");
      setUnconfigured(true);
    }

    return () => {
      active = false;
    };
  }, []);

  const handleConnect = () => {
    window.location.href = "/api/google/connect";
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/google/disconnect", { method: "POST" });
      setConnected(false);
      setStatus("Disconnected");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900">Google Calendar</p>
            {connected === true && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                <CheckCircle className="h-2.5 w-2.5" /> Connected
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            {connected
              ? "Booked showings automatically create calendar events. Busy times block showing slots."
              : "Connect once. Booked showings sync to your calendar. We'll hide times when you're already busy."}
          </p>
          {status && (
            <p className="mt-2 text-xs font-medium text-brand-600">{status}</p>
          )}
        </div>

        <div className="flex-shrink-0">
          {connected === null ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : connected ? (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={unconfigured}
              className="flex items-center gap-1.5 rounded-lg bg-gray-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
