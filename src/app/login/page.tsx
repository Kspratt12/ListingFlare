"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left — branding panel */}
      <div className="hidden w-1/2 bg-gray-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div>
          <h1 className="font-serif text-2xl font-bold text-white">
            Listing<span className="text-brand-400">Flare</span>
          </h1>
        </div>
        <div>
          <p className="font-serif text-display-sm font-bold leading-tight text-white">
            Beautiful listing
            <br />
            websites, in minutes.
          </p>
          <p className="mt-4 max-w-md text-lg text-gray-400">
            Create stunning single-property websites that impress sellers and
            attract buyers. No design skills required.
          </p>
        </div>
        <p className="text-sm text-gray-600">
          &copy; {new Date().getFullYear()} ListingFlare
        </p>
      </div>

      {/* Right — form */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <h1 className="font-serif text-2xl font-bold text-gray-900">
              Listing<span className="text-brand-400">Flare</span>
            </h1>
          </div>

          <h2 className="font-serif text-3xl font-bold text-gray-900">
            Welcome back
          </h2>
          <p className="mt-2 text-gray-500">
            Sign in to manage your property listings.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
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
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 transition-colors focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="Enter your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gray-950 px-4 py-3 font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
