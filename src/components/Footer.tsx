import Link from "next/link";

interface Props {
  // When rendered on a listing page, these props enable the legally
  // required real-estate disclaimers (Fair Housing, MLS "information
  // deemed reliable", agent license #). When absent (e.g. on the
  // marketing homepage) they silently skip.
  agentName?: string;
  brokerage?: string | null;
  licenseNumber?: string | null;
  state?: string | null;
  coAgentName?: string | null;
  coAgentBrokerage?: string | null;
  coAgentLicense?: string | null;
}

export default function Footer({
  agentName,
  brokerage,
  licenseNumber,
  state,
  coAgentName,
  coAgentBrokerage,
  coAgentLicense,
}: Props = {}) {
  const isListing = Boolean(agentName || brokerage || licenseNumber);

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

        {/* Legal disclaimers — only rendered on listing pages. Covers the
            three things virtually every state/MLS requires of real estate
            advertising: agent license display, MLS "deemed reliable"
            disclaimer, and the federal Fair Housing statement. */}
        {isListing && (
          <div className="mt-8 border-t border-gray-100 pt-6">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
              {/* Fair Housing logo (simple SVG — the standard equal-opportunity house icon) */}
              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                <svg viewBox="0 0 40 40" className="h-7 w-7 flex-shrink-0" aria-hidden="true">
                  <path
                    d="M20 4 L4 18 L8 18 L8 34 L32 34 L32 18 L36 18 Z M16 22 L24 22 L24 28 L16 28 Z M20 4 L36 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <line x1="4" y1="18" x2="36" y2="18" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <span className="text-left">
                  <span className="font-semibold text-gray-700">Equal Housing Opportunity.</span>
                  {" "}We support the Fair Housing Act and do not discriminate on the basis of race, color, religion, sex, familial status, national origin, disability, or any other protected class.
                </span>
              </div>

              {/* MLS "information deemed reliable" — required by virtually
                  every MLS. State-neutral wording. */}
              <p className="text-[11px] leading-relaxed text-gray-500">
                Information deemed reliable but not guaranteed. Listings are provided by the real estate professional named above and should be independently verified by prospective buyers. All measurements, schools, taxes, HOA fees, and features are approximate and subject to change without notice.
              </p>

              {/* Agent license line — required by most state real estate
                  commissions on any consumer-facing advertising. Shows
                  both agents on co-listed homes. */}
              {(agentName || licenseNumber || brokerage) && (
                <p className="text-[11px] text-gray-500">
                  {agentName && <span>{agentName}</span>}
                  {brokerage && <span>{agentName ? ", " : ""}{brokerage}</span>}
                  {licenseNumber && <span>{agentName || brokerage ? " · " : ""}License #{licenseNumber}{state ? ` (${state})` : ""}</span>}
                  {coAgentName && (
                    <>
                      <span className="mx-2 text-gray-400">&bull;</span>
                      <span>{coAgentName}</span>
                      {coAgentBrokerage && <span>, {coAgentBrokerage}</span>}
                      {coAgentLicense && <span> · License #{coAgentLicense}{state ? ` (${state})` : ""}</span>}
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
