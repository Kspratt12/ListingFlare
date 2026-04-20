"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Send, Loader2, CheckCircle2, AlertTriangle, Eye } from "lucide-react";

type DryRunResult = {
  dryRun: true;
  candidates: number;
  list: Array<{ id: string; email: string; name: string | null }>;
};

type SendResult = {
  sent: number;
  failed: number;
  errors?: Array<{ id: string; reason: string }>;
};

// Admin-only one-click trigger for the trial re-engage broadcast.
// Gated to the founder email on the client AND the endpoint itself
// requires CRON_SECRET server-side, so both layers have to hold.
const ADMIN_EMAIL = "kelvinspratt11@gmail.com";

export default function ReEngageAdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<"checking" | "yes" | "no">("checking");
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [busy, setBusy] = useState<"idle" | "previewing" | "sending">("idle");
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState(""); // one-time, typed on-page

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      if (user.email?.toLowerCase() === ADMIN_EMAIL) {
        setAuthorized("yes");
      } else {
        setAuthorized("no");
      }
    });
  }, [router]);

  const preview = async () => {
    setBusy("previewing");
    setError(null);
    setDryRun(null);
    try {
      const res = await fetch("/api/trial/re-engage?dryRun=1", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (!res.ok) {
        const t = await res.text();
        setError(`${res.status}: ${t.slice(0, 200)}`);
        return;
      }
      const data = (await res.json()) as DryRunResult;
      setDryRun(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setBusy("idle");
    }
  };

  const sendForReal = async () => {
    setBusy("sending");
    setError(null);
    setSendResult(null);
    try {
      const res = await fetch("/api/trial/re-engage", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (!res.ok) {
        const t = await res.text();
        setError(`${res.status}: ${t.slice(0, 200)}`);
        return;
      }
      const data = (await res.json()) as SendResult;
      setSendResult(data);
      setDryRun(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy("idle");
    }
  };

  if (authorized === "checking") {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center text-sm text-gray-500">Checking access…</div>
    );
  }

  if (authorized === "no") {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="mt-4 font-serif text-2xl font-bold text-gray-900">Admin only</h1>
        <p className="mt-2 text-sm text-gray-500">This page is restricted to the founder account.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">Trial re-engage blast</h1>
        <p className="mt-1 text-sm text-gray-500">
          One-click broadcast to agents who signed up but haven&apos;t been contacted yet with the new features email.
          Safe to run multiple times, already-emailed agents are skipped automatically.
        </p>
      </div>

      {/* Step 1: paste the secret */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Step 1</p>
        <h2 className="mt-1 font-serif text-lg font-semibold text-gray-900">Paste your CRON_SECRET</h2>
        <p className="mt-1 text-sm text-gray-500">
          Find it in Vercel → Settings → Environment Variables. Paste once, then preview + send.
          Not stored, only kept in the browser tab.
        </p>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Bearer token..."
          className="mt-3 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-mono text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          autoComplete="off"
        />
      </div>

      {/* Step 2: preview */}
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Step 2 (recommended)</p>
        <h2 className="mt-1 font-serif text-lg font-semibold text-gray-900">Preview the recipient list</h2>
        <p className="mt-1 text-sm text-gray-500">
          Dry run. Shows who would get the email without sending anything.
        </p>
        <button
          type="button"
          onClick={preview}
          disabled={!secret || busy !== "idle"}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          {busy === "previewing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          Preview who would get it
        </button>

        {dryRun && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <p className="text-sm">
              <span className="font-semibold text-gray-900">{dryRun.candidates}</span>{" "}
              <span className="text-gray-600">
                agent{dryRun.candidates !== 1 ? "s" : ""} would be emailed.
              </span>
            </p>
            {dryRun.list.length > 0 && (
              <ul className="mt-3 max-h-60 space-y-1 overflow-y-auto text-xs text-gray-600">
                {dryRun.list.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-4 border-b border-gray-100 py-1.5 last:border-0">
                    <span className="truncate">{a.name || "(no name)"}</span>
                    <span className="flex-shrink-0 font-mono">{a.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Step 3: send */}
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Step 3</p>
        <h2 className="mt-1 font-serif text-lg font-semibold text-gray-900">Send the blast</h2>
        <p className="mt-1 text-sm text-gray-500">
          Sends up to 100 agents per click, throttled to 120ms per send so you stay under Resend&apos;s rate limit.
          Already-emailed agents are skipped. Run again to continue where it stopped.
        </p>
        <button
          type="button"
          onClick={sendForReal}
          disabled={!secret || busy !== "idle"}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {busy === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {busy === "sending" ? "Sending..." : "Send now"}
        </button>

        {sendResult && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  Sent to {sendResult.sent} agent{sendResult.sent !== 1 ? "s" : ""}.
                  {sendResult.failed > 0 ? ` ${sendResult.failed} failed.` : ""}
                </p>
                {sendResult.errors && sendResult.errors.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-emerald-800">
                    {sendResult.errors.map((e, i) => (
                      <li key={i} className="font-mono">
                        {e.id.slice(0, 8)}… {e.reason.slice(0, 80)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
