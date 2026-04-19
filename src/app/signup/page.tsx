"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsPro = searchParams.get("plan") === "pro";
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // If email confirmation is required, show confirmation message
    if (data.user?.identities?.length === 0) {
      setError("An account with this email already exists. Please sign in.");
      setLoading(false);
      return;
    }

    // Try to update profile with name - wrapped in try-catch because
    // the profile row may not exist yet if email confirmation is required
    if (data.user) {
      try {
        await supabase
          .from("agent_profiles")
          .upsert({ id: data.user.id, name, email });
      } catch {
        // Profile will be created by DB trigger when user confirms email
      }
    }

    // Check if session exists (no email confirmation required)
    if (data.session) {
      if (wantsPro) {
        // Auto-redirect to Stripe checkout
        try {
          const res = await fetch("/api/stripe/checkout", { method: "POST" });
          const checkoutData = await res.json();
          if (checkoutData.url) {
            window.location.href = checkoutData.url;
            return;
          }
        } catch {
          // Fall through to dashboard if checkout fails
        }
      }
      router.push("/dashboard");
      router.refresh();
    } else {
      // Email confirmation required - show check your email screen
      setEmailSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left - branding panel */}
      <div className="hidden w-1/2 bg-gray-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href="/">
          <h1 className="font-serif text-2xl font-bold text-white">
            Listing<span className="text-brand-400">Flare</span>
          </h1>
        </Link>
        <div>
          <p className="font-serif text-display-sm font-bold leading-tight text-white">
            Your listings
            <br />
            deserve better.
          </p>
          <p className="mt-4 max-w-md text-lg text-gray-400">
            Join hundreds of agents using ListingFlare to win more listings
            and impress their clients.
          </p>
        </div>
        <p className="text-sm text-gray-600">
          &copy; {new Date().getFullYear()} ListingFlare
        </p>
      </div>

      {/* Right - form */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="font-serif text-2xl font-bold text-gray-900">
              Listing<span className="text-brand-400">Flare</span>
            </Link>
          </div>

          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>

          {emailSent ? (
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <h2 className="mt-4 font-serif text-2xl font-bold text-gray-900">Check your email</h2>
              <p className="mt-2 text-gray-500">
                We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account and start your free trial.
              </p>
              <Link
                href="/login"
                className="mt-8 inline-flex items-center rounded-lg bg-gray-950 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
          <>
          <h2 className="font-serif text-3xl font-bold text-gray-900">
            {wantsPro ? "Create your account" : "Start your free trial"}
          </h2>
          <p className="mt-2 text-gray-500">
            {wantsPro ? "You'll be taken to checkout after signup." : "14 days free. No credit card required."}
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 transition-colors focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="Victoria Ashworth"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
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
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 transition-colors focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="Min 6 characters"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gray-950 px-4 py-3 font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Creating account..." : wantsPro ? "Create Account & Pay" : "Start Free Trial"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Sign in
            </Link>
          </p>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
