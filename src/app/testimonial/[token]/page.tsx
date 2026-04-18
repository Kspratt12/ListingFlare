"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Star, CheckCircle, Loader2 } from "lucide-react";

export default function TestimonialPage() {
  const params = useParams();
  const token = params?.token as string;

  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [quote, setQuote] = useState("");
  const [consent, setConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quote.length < 10) {
      setError("Please share a few words about your experience");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/testimonials/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          authorName,
          rating,
          quote,
          consentToPublish: consent,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white border border-gray-200 p-8 text-center shadow-sm">
          <CheckCircle className="mx-auto h-14 w-14 text-emerald-500" />
          <h1 className="mt-5 font-serif text-2xl font-bold text-gray-900">
            Thank you!
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Your review means the world to your agent.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
        <h1 className="font-serif text-2xl font-bold text-gray-900">
          Share your experience
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          A quick review helps other buyers and sellers.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Star rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating
            </label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (hover || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    className="transition-transform hover:scale-110"
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`h-8 w-8 ${active ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div>
            <label
              htmlFor="author"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Your name
            </label>
            <input
              id="author"
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              placeholder="How you'd like to be attributed"
            />
          </div>

          {/* Quote */}
          <div>
            <label
              htmlFor="quote"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Your review
            </label>
            <textarea
              id="quote"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={5}
              required
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              placeholder="What stood out about working with your agent?"
            />
          </div>

          {/* Consent */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400"
            />
            <span className="text-xs text-gray-600">
              I agree to have my review publicly displayed on the agent&apos;s website and marketing materials.
            </span>
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-950 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
}
