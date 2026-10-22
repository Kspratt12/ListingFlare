import type { FlyerData } from "@/lib/types";
import { formatPhone } from "@/lib/formatters";

interface Props {
  data: FlyerData;
  // Free text shown over the hero, e.g. "Sat, Oct 25 · 1-4 PM"
  eventLabel?: string;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);

// US Letter (8.5in x 11in). Plain <img> on purpose: next/image lazy-loads and
// resizes, which can leave blanks in a printed page.
export default function OpenHouseFlyer({ data, eventLabel }: Props) {
  const { listing, agent, qrDataUrl } = data;
  const accent = listing.brand_color || agent.brand_color || "#b8965a";
  const [hero, ...rest] = listing.photos || [];
  const gallery = rest.slice(0, 3);
  const features = (listing.features || []).slice(0, 6);

  const specs = [
    { label: "Beds", value: listing.beds },
    { label: "Baths", value: listing.baths },
    { label: "Sq Ft", value: listing.sqft ? listing.sqft.toLocaleString("en-US") : null },
    { label: "Built", value: listing.year_built },
  ].filter((s) => s.value);

  return (
    <div
      className="relative flex h-[11in] w-[8.5in] flex-col overflow-hidden bg-white text-gray-900 break-inside-avoid print:shadow-none"
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      {/* Hero */}
      <div className="relative h-[4.1in] w-full flex-none bg-gray-200">
        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero.src} alt={hero.alt || listing.street} loading="eager" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
        <div
          className="absolute left-0 top-8 px-6 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white"
          style={{ backgroundColor: accent }}
        >
          Open House
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-8 pb-6 text-white">
          {eventLabel && <p className="mb-1 text-sm font-medium opacity-90">{eventLabel}</p>}
          <p className="font-serif text-4xl font-bold">{formatPrice(listing.price)}</p>
          <p className="mt-1 text-lg opacity-95">
            {listing.street}, {listing.city}, {listing.state} {listing.zip}
          </p>
        </div>
      </div>

      {/* Photo grid */}
      {gallery.length > 0 && (
        <div className="grid flex-none grid-cols-3 gap-1 pt-1">
          {gallery.map((photo) => (
            <div key={photo.src} className="h-[1.5in] overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt={photo.alt || listing.street} loading="eager" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Specs */}
      <div className="flex flex-none items-center justify-center gap-10 border-b border-gray-200 px-8 py-4">
        {specs.map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-serif text-2xl font-bold" style={{ color: accent }}>{s.value}</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Description + features */}
      <div className="flex min-h-0 flex-1 gap-8 overflow-hidden px-8 py-5">
        <p className="line-clamp-[8] flex-1 text-[13px] leading-relaxed text-gray-700">{listing.description}</p>
        {features.length > 0 && (
          <ul className="w-[2.4in] flex-none space-y-1.5 text-[12px] text-gray-700">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 break-inside-avoid">
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full" style={{ backgroundColor: accent }} />
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer: agent + QR */}
      <div className="flex flex-none items-center gap-5 px-8 py-5 text-white" style={{ backgroundColor: "#0f172a" }}>
        {agent.headshot_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={agent.headshot_url}
            alt={agent.name}
            loading="eager"
            className="h-20 w-20 flex-none rounded-full border-2 object-cover"
            style={{ borderColor: accent }}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-serif text-xl font-bold">{agent.name}</p>
          <p className="text-sm opacity-80">
            {[agent.title, agent.brokerage].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 text-sm opacity-90">
            {[agent.phone && formatPhone(agent.phone), agent.email].filter(Boolean).join("  ·  ")}
          </p>
          {agent.license_number && (
            <p className="mt-0.5 text-[10px] opacity-60">License #{agent.license_number}</p>
          )}
        </div>
        <div className="flex-none text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="Scan for the full listing" className="h-24 w-24 rounded-md bg-white p-1" />
          <p className="mt-1 text-[10px] uppercase tracking-widest opacity-70">Scan for photos</p>
        </div>
      </div>
    </div>
  );
}
