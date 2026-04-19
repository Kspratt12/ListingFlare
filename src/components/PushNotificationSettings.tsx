"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

// Dismissal key mirrored from PushNotificationPrompt so "Re-enable the
// banner" here actually undoes what the dashboard banner stored.
const DISMISS_KEY = "listingflare:push-prompt-dismissed";

type Status = "unknown" | "unsupported" | "prompt" | "granted" | "denied";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof atob === "function" ? atob(base64Safe) : "";
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

// Settings counterpart to PushNotificationPrompt. Always visible so
// agents can re-enable alerts even if they dismissed the main-dashboard
// banner. Tracks the same browser permission + subscription state.
export default function PushNotificationSettings() {
  const [status, setStatus] = useState<Status>("unknown");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    if (!supported) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as Status);
    try {
      setBannerDismissed(window.localStorage.getItem(DISMISS_KEY) === "true");
    } catch {
      // ignore
    }
  }, []);

  const showBannerAgain = () => {
    try {
      window.localStorage.removeItem(DISMISS_KEY);
      setBannerDismissed(false);
      setToast("The dashboard banner will show again next time you open the dashboard.");
      setTimeout(() => setToast(null), 4000);
    } catch {
      // ignore
    }
  };

  const enable = async () => {
    setBusy(true);
    setToast(null);
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setToast("Push isn't configured on this deployment yet.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission as Status);
        setToast(
          permission === "denied"
            ? "Notifications were blocked. Enable them in your browser settings to turn this on."
            : "You can enable notifications anytime from here."
        );
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
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
      setToast("Phone alerts enabled. Sending you a test notification…");
      fetch("/api/push/test", { method: "POST" }).catch(() => {});
      setTimeout(() => setToast(null), 4000);
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
      setToast(res.ok ? "Test sent. Check your phone." : "Couldn't send test. Try re-enabling notifications.");
    } catch {
      setToast("Couldn't send test.");
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg font-semibold text-gray-900">Phone Alerts</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Your phone buzzes the second a buyer books a showing or sends an inquiry. Works on iPhone (after adding to home screen) and Android.
          </p>
        </div>
        {status === "granted" ? (
          <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            On
          </span>
        ) : status === "denied" ? (
          <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            <AlertCircle className="h-3.5 w-3.5" />
            Blocked
          </span>
        ) : status === "unsupported" ? (
          <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            <BellOff className="h-3.5 w-3.5" />
            Not supported
          </span>
        ) : (
          <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            <Bell className="h-3.5 w-3.5" />
            Off
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {status === "granted" ? (
          <button
            type="button"
            onClick={sendTest}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
            Send a test notification
          </button>
        ) : status === "prompt" || status === "unknown" ? (
          <button
            type="button"
            onClick={enable}
            disabled={busy || status === "unknown"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
            Turn on phone alerts
          </button>
        ) : status === "denied" ? (
          <p className="text-xs text-amber-800">
            You previously blocked notifications. To re-enable, click the lock icon in your browser&apos;s address bar, allow notifications, then refresh this page.
          </p>
        ) : null}

        {bannerDismissed && status !== "granted" && status !== "unsupported" && (
          <button
            type="button"
            onClick={showBannerAgain}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Show the banner again
          </button>
        )}
      </div>

      {toast && (
        <p className="mt-3 text-xs font-medium text-brand-700">{toast}</p>
      )}
    </section>
  );
}
