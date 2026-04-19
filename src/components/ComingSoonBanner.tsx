"use client";

import { useEffect, useState } from "react";
import { Calendar, Bell, Check, Loader2 } from "lucide-react";

interface Props {
  listingId: string;
  listingAddress: string;
  launchDate: string | null;
  isDemo?: boolean;
}

function computeTimeLeft(target: string | null) {
  if (!target) return null;
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

// Shows on any listing with status=coming_soon. Hides the regular
// showing scheduler and lead form underneath - this is the ONLY
// action on the page until the listing goes live.
export default function ComingSoonBanner({ listingId, listingAddress, launchDate, isDemo = false }: Props) {
  const [timeLeft, setTimeLeft] = useState(computeTimeLeft(launchDate));
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!launchDate) return;
    const tick = () => setTimeLeft(computeTimeLeft(launchDate));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [launchDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setState("submitting");
    setErrorMsg("");

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
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 py-20 md:py-28">
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: "radial-gradient(circle at 20% 30%, #b8965a 0%, transparent 40%), radial-gradient(circle at 80% 70%, #b8965a 0%, transparent 40%)",
      }} />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
          <Calendar className="h-3.5 w-3.5" />
          Coming Soon
        </div>
        <h1 className="mt-6 font-serif text-4xl font-bold text-white md:text-6xl">
          {listingAddress}
        </h1>
        <p className="mt-4 text-lg text-gray-300 md:text-xl">
          This home hits the market soon. Be the first to know.
        </p>

        {timeLeft && (
          <div className="mt-10 grid grid-cols-4 gap-3 md:gap-6">
            {[
              { label: "Days", value: timeLeft.days },
              { label: "Hours", value: timeLeft.hours },
              { label: "Minutes", value: timeLeft.minutes },
              { label: "Seconds", value: timeLeft.seconds },
            ].map((unit) => (
              <div key={unit.label} className="rounded-xl border border-white/10 bg-white/5 py-4 backdrop-blur-sm md:py-6">
                <p className="font-serif text-3xl font-bold text-white md:text-5xl">
                  {String(unit.value).padStart(2, "0")}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 md:text-xs">
                  {unit.label}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mx-auto mt-10 max-w-md">
          {state === "done" ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-300">
              <Check className="h-4 w-4" />
              You&apos;re on the list. We&apos;ll notify you the moment it&apos;s live.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
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
                  className="flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-gray-400 backdrop-blur-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
                <button
                  type="submit"
                  disabled={state === "submitting"}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                  Notify Me
                </button>
              </div>
              {state === "error" && errorMsg && (
                <p className="text-xs text-red-400">{errorMsg}</p>
              )}
              <p className="text-xs text-gray-400">
                No spam. Just one email when this home goes live.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
