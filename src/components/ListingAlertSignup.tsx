"use client";

import { useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";

interface Props {
  listingId: string;
  listingAddress: string;
  isDemo?: boolean;
}

export default function ListingAlertSignup({ listingId, listingAddress, isDemo = false }: Props) {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setState("submitting");
    setErrorMsg("");

    // Demo mode: fake-succeed without hitting the API (listing isn't in DB)
    if (isDemo) {
      setTimeout(() => setState("done"), 400);
      return;
    }

    try {
      const res = await fetch("/api/listings/alerts/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, email, honeypot }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Couldn't subscribe");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setErrorMsg("Something went wrong");
      setState("error");
    }
  };

  return (
    <section className="bg-gray-50 py-14 md:py-16">
      <div className="mx-auto max-w-3xl px-6">
        {/* Dark brand-tinted card matches the Property Details section
            so the "stay informed" CTA reads as premium rather than a
            generic newsletter signup. */}
        <div
          className="relative overflow-hidden rounded-2xl border border-white/10 p-7 shadow-2xl shadow-black/20 md:p-10"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--agent-brand, #0f172a) 55%, #0a0a0a) 0%, color-mix(in srgb, var(--agent-brand, #0f172a) 30%, #0a0a0a) 100%)",
          }}
        >
          {/* Soft brand glow in the top-right */}
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-30 blur-3xl"
            style={{ backgroundColor: "var(--agent-brand, #b8965a)" }}
          />
          {/* Brand accent stripe along the top */}
          <div
            className="absolute left-0 right-0 top-0 h-px"
            style={{
              background: "linear-gradient(90deg, transparent 0%, var(--agent-brand, #b8965a) 20%, var(--agent-brand, #b8965a) 80%, transparent 100%)",
            }}
          />

          <div className="relative flex items-start gap-4 md:gap-5">
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-white/15 text-white md:h-14 md:w-14"
              style={{
                background: "color-mix(in srgb, var(--agent-brand, #b8965a) 35%, transparent)",
              }}
            >
              <Bell className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.3em]"
                style={{ color: "color-mix(in srgb, var(--agent-brand, #b8965a) 60%, white)" }}
              >
                Stay in the loop
              </p>
              <h3 className="mt-1 font-serif text-2xl font-bold text-white md:text-3xl">
                Get notified about {listingAddress.split(",")[0]}
              </h3>
              <p className="mt-2 text-sm text-white/65">
                Price changes, status updates, and open house times delivered straight to your inbox. No spam, no marketing. Unsubscribe anytime.
              </p>

              {state === "done" ? (
                <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-300 backdrop-blur-sm">
                  <Check className="h-4 w-4" />
                  Subscribed. Check your email to confirm.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-5">
                  <input
                    type="text"
                    name="_hp"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    className="absolute -left-[9999px] h-0 w-0 opacity-0"
                    aria-hidden="true"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="flex-1 rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 backdrop-blur-sm transition-colors focus:border-white/40 focus:bg-white/15 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={state === "submitting" || !email}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
                      style={{
                        background: "var(--agent-brand, #b8965a)",
                      }}
                    >
                      {state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                      {state === "submitting" ? "Subscribing…" : "Notify Me"}
                    </button>
                  </div>
                  {state === "error" && errorMsg && (
                    <p className="mt-2 text-xs text-red-300">{errorMsg}</p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
