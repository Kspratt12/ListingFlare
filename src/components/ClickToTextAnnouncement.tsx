"use client";

import { useEffect, useState } from "react";
import { MessageSquare, X, Sparkles } from "lucide-react";

const DISMISS_KEY = "listingflare:click-to-text-seen";

export default function ClickToTextAnnouncement() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(DISMISS_KEY);
      if (!seen) setVisible(true);
    } catch {
      // localStorage unavailable - just don't show the banner
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // noop
    }
  };

  if (!visible) return null;

  return (
    <div className="relative mb-4 overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-4">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 rounded-md p-1 text-emerald-600 transition-colors hover:bg-emerald-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500">
          <MessageSquare className="h-4 w-4 text-white" />
        </div>
        <div className="pr-6">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            Text leads straight from your dashboard
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Tap the green <span className="font-semibold text-emerald-700">Text</span> button on any lead — your iPhone or Android will open Messages with their number and a ready-to-send note. The text sends from <span className="font-semibold">your real number</span>, so replies land on your phone. Works best on mobile.
          </p>
        </div>
      </div>
    </div>
  );
}
