"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Eye } from "lucide-react";

interface Props {
  listingId: string;
}

// Uses Supabase Realtime Presence to count active viewers on a listing
// in real time. Each browser tab joins a shared channel keyed by listingId
// and broadcasts a heartbeat. The count updates when someone joins or leaves.
// Only shows once there are 2+ viewers so a single viewer doesn't see "1 viewer"
// which is weird. Hides entirely with 0 or 1.
export default function LiveViewerCounter({ listingId }: Props) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!listingId) return;
    const supabase = createClient();
    const channel = supabase.channel(`listing-viewers:${listingId}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const total = Object.keys(state).length;
        setCount(total);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ viewing_at: new Date().toISOString() });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [listingId]);

  // Don't show pill for 1 or fewer viewers - "1 viewer" alone looks sparse
  if (count < 2) return null;

  return (
    <div className="fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full border border-emerald-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-lg backdrop-blur-sm">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <Eye className="h-3 w-3" />
      {count} people viewing right now
    </div>
  );
}
