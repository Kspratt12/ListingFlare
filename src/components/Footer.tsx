import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white py-10">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="font-serif text-lg font-bold text-gray-900">
            Listing<span className="text-brand-400">Flare</span>
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <span>&middot;</span>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
            <span>&middot;</span>
            <span>&copy; {new Date().getFullYear()} ListingFlare</span>
          </div>
          <p className="text-xs text-gray-300">
            Property website powered by ListingFlare
          </p>
        </div>
      </div>
    </footer>
  );
}
