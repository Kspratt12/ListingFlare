"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const DISMISS_KEY = "listingflare:push-prompt-dismissed";

type Status = "unknown" | "unsupported" | "prompt" | "granted" | "denied" | "dismissed";

// Convert the VAPID public key from URL-safe base64 to Uint8Array,
// which is what pushManager.subscribe expects.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof atob === "function" ? atob(base64Safe) : "";
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export default function PushNotificationPrompt() {
  const [status, setStatus] = useState<Status>("unknown");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Service workers + push manager aren't available on older browsers
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) {
      setStatus("unsupported");
      return;
    }

    try {
      const dismissed = window.localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        setStatus("dismissed");
        return;
      }
    } catch {
      // noop
    }

    setStatus(Notification.permission as Status);
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // noop
    }
    setStatus("dismissed");
  };

  const enable = async () => {
    setBusy(true);
    setToast(null);
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setToast("Push isn't configured on this deployment yet. Try again later.");
        return;
      }

      // Register service worker if not already
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Ask for permission - on iOS this requires the app to be installed
      // to the home screen first, but browsers handle the messaging.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission as Status);
        setToast(
          permission === "denied"
            ? "Notifications were blocked. Enable them in your browser settings to turn this on."
            : "You can enable notifications anytime from this banner."
        );
        return;
      }

      // Create subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // TS complains about ArrayBufferLike vs ArrayBuffer; the spec accepts either
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const subJson = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      if (!res.ok) {
        setToast("Couldn't save your subscription. Try again.");
        await subscription.unsubscribe();
        return;
      }

      setStatus("granted");

      // Fire a test notification so they see it works immediately
      fetch("/api/push/test", { method: "POST" }).catch(() => {});
    } catch (err) {
      console.error("Enable push error:", err);
      setToast("Something went wrong setting up notifications.");
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      if (res.ok) {
        setToast("Test sent. Check your phone.");
      } else {
        setToast("Couldn't send test. Try re-enabling notifications.");
      }
    } catch {
      setToast("Couldn't send test.");
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  // Hide entirely if not relevant
  if (status === "unknown" || status === "unsupported" || status === "dismissed") {
    return null;
  }

  // Once enabled, show a tiny confirmation once and then hide on next load via dismiss
  if (status === "granted") {
    return (
      <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-4">
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-3 top-3 rounded-md p-1 text-emerald-600 hover:bg-emerald-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500">
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">
              Phone alerts are on.
            </p>
            <p className="mt-0.5 text-xs text-gray-600">
              Your phone will buzz when a new lead or showing comes in, even when you&apos;re not in the dashboard.
            </p>
            {toast && <p className="mt-2 text-xs font-medium text-emerald-700">{toast}</p>}
            <button
              onClick={sendTest}
              disabled={busy}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <BellRing className="h-3 w-3" />}
              Send me a test
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50 p-4">
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-3 top-3 rounded-md p-1 text-amber-700 hover:bg-amber-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-500">
            <AlertCircle className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">
              Notifications are blocked
            </p>
            <p className="mt-0.5 text-xs text-gray-600">
              You previously blocked browser notifications. To enable phone alerts, click the lock icon in your browser&apos;s address bar, allow notifications, then refresh.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // "prompt" or "default" - ask them to turn it on
  const isIOS = typeof window !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true));

  return (
    <div className="relative overflow-hidden rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 via-white to-amber-50 p-4">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 rounded-md p-1 text-gray-400 hover:bg-gray-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-500">
          <Bell className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">
            Get phone alerts for new leads
          </p>
          <p className="mt-0.5 text-xs text-gray-600">
            Your phone buzzes the second a buyer books a showing or fills out your form. Texts go from your real number if you tap back. One tap to turn on.
          </p>
          {isIOS && !isStandalone && (
            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              <p className="font-semibold">iPhone setup (one time):</p>
              <p className="mt-1">
                Tap the <span className="font-semibold">Share</span> icon in Safari, scroll down, tap <span className="font-semibold">&quot;Add to Home Screen&quot;</span>, then open ListingFlare from the home screen icon and come back here to enable alerts.
              </p>
            </div>
          )}
          {!isIOS || isStandalone ? (
            <button
              onClick={enable}
              disabled={busy}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <BellRing className="h-3 w-3" />}
              Turn on phone alerts
            </button>
          ) : (
            <button
              onClick={dismiss}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
            >
              <BellOff className="h-3 w-3" />
              Maybe later
            </button>
          )}
          {toast && <p className="mt-2 text-xs font-medium text-brand-700">{toast}</p>}
        </div>
      </div>
    </div>
  );
}
