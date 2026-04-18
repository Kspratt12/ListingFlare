"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Star, CheckCircle, Loader2 } from "lucide-react";

export default function FeedbackPage() {
  const params = useParams();
  const token = params?.token as string;

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [notes, setNotes] = useState("");
  const [interestLevel, setInterestLevel] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // If user reloads and already submitted, show confirmation
  useEffect(() => {
    // could check the status via GET; keeping minimal
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please pick a rating");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rating, notes, interestLevel }),
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
            Your feedback was shared with your agent.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
        <h1 className="font-serif text-2xl font-bold text-gray-900">
          How was the showing?
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          30 seconds helps your agent serve you better.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Star rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your rating
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
                      className={`h-9 w-9 ${active ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interest */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Are you interested in this property?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "very_interested", label: "Very" },
                { value: "maybe", label: "Maybe" },
                { value: "not_interested", label: "Not for us" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setInterestLevel(opt.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    interestLevel === opt.value
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Anything you&apos;d like to share? (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              placeholder="What did you love? What was off? Questions we can follow up on?"
            />
          </div>

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
            {submitting ? "Submitting…" : "Send Feedback"}
          </button>
        </form>
      </div>
    </div>
  );
}
