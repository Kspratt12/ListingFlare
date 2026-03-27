"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-500">
        Something went wrong
      </p>
      <h1 className="mt-4 font-serif text-3xl font-bold text-gray-900 md:text-4xl">
        An unexpected error occurred
      </h1>
      <p className="mt-4 max-w-md text-gray-500">
        We are sorry for the inconvenience. Please try again or return to the
        homepage.
      </p>
      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={reset}
          className="rounded-full bg-gray-950 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Try Again
        </button>
        <a
          href="/"
          className="rounded-full border border-gray-200 px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}
