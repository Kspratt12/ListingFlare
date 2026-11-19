import Link from "next/link";
import { Home, ArrowRight } from "lucide-react";
import { factsLine } from "@/lib/listingFacts";
import { listingPath, statusBadge, type SiteListing } from "@/lib/agentSite";

interface Props {
  listings: SiteListing[];
  agentName: string;
  // e.g. /agent/kelvin — link to the agent's full collection
  profileHref: string;
}

// "More listings from this agent". Rendered only when the agent turned it on in Settings and has at
// least one other active listing. Data is selected on the server (app/listing/[id]/page.tsx) for this
// agent only, so drafts, archived homes and other agents' listings can never appear here.
export default function OtherListings({ listings, agentName, profileHref }: Props) {
  if (!listings || listings.length === 0) return null;
  const firstName = agentName?.split(" ")[0] || "this agent";

  return (
    <section className="bg-white py-16 md:py-20" aria-labelledby="other-listings-heading">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">More from {firstName}</p>
            <h2 id="other-listings-heading" className="mt-2 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              More listings from this agent
            </h2>
          </div>
          <Link href={profileHref} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            View all of {firstName}&apos;s listings
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => {
            const hero = l.photos?.[0]?.src;
            const badge = statusBadge(l.status);
            const facts = factsLine(l, " · ", { beds: "bd", baths: "ba", sqft: "sqft" });
            return (
              <Link
                key={l.id}
                href={listingPath(l)}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                  {hero ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={hero}
                      alt={l.photos?.[0]?.alt || l.street}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300">
                      <Home className="h-10 w-10" />
                    </div>
                  )}
                  {badge && (
                    <span className="absolute left-3 top-3 rounded-full bg-gray-950/85 px-2.5 py-1 text-[11px] font-semibold text-white">
                      {badge}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-serif text-lg font-bold text-gray-900">
                    {l.price > 0 ? `$${Math.round(l.price).toLocaleString("en-US")}` : "Price on request"}
                  </p>
                  <p className="mt-1 truncate text-sm text-gray-700">{l.street}</p>
                  <p className="truncate text-xs text-gray-500">{[l.city, l.state].filter(Boolean).join(", ")}</p>
                  {facts && <div className="mt-2 text-[11px] text-gray-600">{facts}</div>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
