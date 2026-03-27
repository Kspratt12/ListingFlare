import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you are looking for does not exist.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-500">
        404
      </p>
      <h1 className="mt-4 font-serif text-4xl font-bold text-gray-900 md:text-5xl">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-lg text-gray-500">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-8 flex items-center gap-4">
        <Link
          href="/"
          className="rounded-full bg-gray-950 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Back to Home
        </Link>
        <Link
          href="/blog"
          className="rounded-full border border-gray-200 px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Read the Blog
        </Link>
      </div>
    </div>
  );
}
