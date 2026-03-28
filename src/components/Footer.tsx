import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white py-10">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          {/* Logo + tagline */}
          <div className="text-center md:text-left">
            <p className="font-serif text-lg font-bold text-gray-900">
              Listing<span className="text-brand-400">Flare</span>
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Real estate software for listing agents
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
            <Link href="/blog" className="transition-colors hover:text-gray-900">Blog</Link>
            <Link href="/about" className="transition-colors hover:text-gray-900">About</Link>
            <Link href="/demo" className="transition-colors hover:text-gray-900">Demo</Link>
            <Link href="/privacy" className="transition-colors hover:text-gray-900">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-gray-900">Terms</Link>
          </div>

          {/* Contact + copyright */}
          <div className="text-center md:text-right">
            <a
              href="mailto:kelvin@listingflare.com"
              className="text-sm text-gray-500 transition-colors hover:text-brand-600"
            >
              kelvin@listingflare.com
            </a>
            <p className="mt-1 text-xs text-gray-300">
              &copy; {new Date().getFullYear()} ListingFlare
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
