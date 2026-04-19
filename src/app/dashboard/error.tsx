"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

// Dashboard-scoped error boundary. Catches any uncaught render error
// inside /dashboard/* and renders a friendly retry UI instead of the
// generic Next.js error page. Logs to the console so Vercel captures
// the stack.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        <h1 className="mt-5 font-serif text-2xl font-bold text-gray-900">
          Something went sideways
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          The dashboard hit a snag loading this page. It&apos;s been logged. Try again — if it keeps happening, email kelvin@listingflare.com.
        </p>
        {error.digest && (
          <p className="mt-3 text-[11px] font-mono text-gray-400">Ref: {error.digest}</p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Home className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
