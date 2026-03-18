"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-gray-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href="/">
          <h1 className="font-serif text-2xl font-bold text-white">
            Listing<span className="text-brand-400">Flare</span>
          </h1>
        </Link>
        <div>
          <p className="font-serif text-display-sm font-bold leading-tight text-white">
            We&apos;ll get you
            <br />
            back in.
          </p>
        </div>
        <p className="text-sm text-gray-600">
          &copy; {new Date().getFullYear()} ListingFlare
        </p>
      </div>

      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="font-serif text-2xl font-bold text-gray-900">
              Listing<span className="text-brand-400">Flare</span>
            </Link>
          </div>

          <Link
            href="/login"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>

          {sent ? (
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <h2 className="mt-4 font-serif text-2xl font-bold text-gray-900">Check your email</h2>
              <p className="mt-2 text-gray-500">
                We sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.
              </p>
              <Link
                href="/login"
                className="mt-8 inline-flex items-center rounded-lg bg-gray-950 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-serif text-3xl font-bold text-gray-900">
                Forgot password?
              </h2>
              <p className="mt-2 text-gray-500">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleReset} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 transition-colors focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-gray-950 px-4 py-3 font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
