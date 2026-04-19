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
    <section className="bg-gray-50 py-12 md:py-14">
      <div className="mx-auto max-w-2xl px-6">
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-brand-50/60 via-white to-amber-50/50 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-xl font-semibold text-gray-900 md:text-2xl">
                Get notified about {listingAddress.split(",")[0]}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Price changes. Status updates. No spam, no marketing. Unsubscribe anytime.
              </p>

              {state === "done" ? (
                <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  <Check className="h-4 w-4" />
                  Subscribed. Check your email to confirm.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-5">
                  {/* Honeypot */}
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
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                    <button
                      type="submit"
                      disabled={state === "submitting" || !email}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-950 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      {state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                      Notify Me
                    </button>
                  </div>
                  {state === "error" && errorMsg && (
                    <p className="mt-2 text-xs text-red-600">{errorMsg}</p>
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
