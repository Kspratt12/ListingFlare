"use client";

import { MapPin, Footprints, GraduationCap, ExternalLink, Eye } from "lucide-react";

interface Props {
  street: string;
  city: string;
  state: string;
  zip: string;
  schoolElementary?: string | null;
  schoolMiddle?: string | null;
  schoolHigh?: string | null;
}

export default function NeighborhoodInfo({
  street,
  city,
  state,
  zip,
  schoolElementary,
  schoolMiddle,
  schoolHigh,
}: Props) {
  const hasNamedSchools = Boolean(schoolElementary || schoolMiddle || schoolHigh);
  const fullAddress = `${street}, ${city}, ${state} ${zip}`;
  const encoded = encodeURIComponent(fullAddress);

  // Google Maps embed uses the standard "place" mode which works without an API key
  const mapSrc = `https://www.google.com/maps?q=${encoded}&output=embed`;

  const walkScoreUrl = `https://www.walkscore.com/score/${encoded}`;
  const greatSchoolsUrl = `https://www.greatschools.org/search/search.page?q=${encoded}`;
  const googleDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&query=${encoded}`;

  return (
    <section className="bg-gray-50 py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            The Neighborhood
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-4xl">
            What it&apos;s like to live here
          </h2>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {/* Map */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white lg:col-span-2">
            <div className="relative aspect-[4/3] w-full bg-gray-100 md:aspect-video">
              <iframe
                src={mapSrc}
                className="absolute inset-0 h-full w-full"
                loading="lazy"
                title={`Map of ${street}`}
                allow="fullscreen"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                <p className="truncate text-sm text-gray-700">{fullAddress}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <a
                  href={streetViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="h-3 w-3" />
                  Street View
                </a>
                <a
                  href={googleDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
                >
                  Directions
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Walk Score + Schools */}
          <div className="flex flex-col gap-4">
            <a
              href={walkScoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Footprints className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-gray-900">Walkability</h3>
                <p className="mt-1 text-sm text-gray-500">
                  See walk, transit, and bike scores for this address on Walk Score.
                </p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-brand-700 group-hover:underline">
                Open Walk Score
                <ExternalLink className="h-3 w-3" />
              </span>
            </a>

            {hasNamedSchools ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-gray-900">Schools</h3>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    {schoolElementary && (
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Elem</span>
                        <span>{schoolElementary}</span>
                      </li>
                    )}
                    {schoolMiddle && (
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Mid</span>
                        <span>{schoolMiddle}</span>
                      </li>
                    )}
                    {schoolHigh && (
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">High</span>
                        <span>{schoolHigh}</span>
                      </li>
                    )}
                  </ul>
                </div>
                <a
                  href={greatSchoolsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                >
                  See ratings on GreatSchools
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <a
                href={greatSchoolsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-gray-900">Schools</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    See elementary, middle, and high school ratings near this address on GreatSchools.
                  </p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-brand-700 group-hover:underline">
                  Open GreatSchools
                  <ExternalLink className="h-3 w-3" />
                </span>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
