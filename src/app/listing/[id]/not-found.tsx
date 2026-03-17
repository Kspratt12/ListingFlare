import Link from "next/link";

export default function ListingNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <h1 className="font-serif text-6xl font-bold text-gray-900">404</h1>
      <p className="mt-4 text-xl text-gray-500">
        This listing could not be found.
      </p>
      <p className="mt-2 text-gray-400">
        It may have been removed or is no longer published.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-gray-950 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
      >
        Go Home
      </Link>
    </div>
  );
}
