import type { FlyerData } from "@/lib/types";
import { formatPhone } from "@/lib/formatters";
import { visibleFacts } from "@/lib/listingFacts";
import { DEFAULT_FLYER_OPTIONS, QR_CAPTIONS, formatEventLabel, type FlyerOptions } from "@/lib/flyerOptions";

interface Props {
  data: FlyerData;
  options?: FlyerOptions;
  // Legacy free-text date label (kept for callers that still pass it); options.eventDate wins.
  eventLabel?: string;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);

// US Letter (8.5in x 11in). Plain <img> on purpose: next/image lazy-loads and
// resizes, which can leave blanks in a printed page.
export default function OpenHouseFlyer({ data, options = DEFAULT_FLYER_OPTIONS, eventLabel }: Props) {
  const { listing, agent } = data;
  const o = options;
  const accent = o.accent || listing.brand_color || agent.brand_color || "#b8965a";
  const [hero, ...rest] = listing.photos || [];
  const gallery = rest.slice(0, 3);
  const features = o.showFeatures ? (listing.features || []).slice(0, 6) : [];
  const when = formatEventLabel(o) || eventLabel || null;
  const qrSrc = o.qrTarget === "signin" && data.signInQrDataUrl ? data.signInQrDataUrl : data.qrDataUrl;
  const qrCaption = QR_CAPTIONS[o.qrTarget === "signin" && data.signInQrDataUrl ? "signin" : "listing"];
  const address = `${listing.street}, ${[listing.city, [listing.state, listing.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")}`;
  const price = listing.price > 0 ? formatPrice(listing.price) : null;

  // Same display rules as the listing page: blank / zero facts are left out, never printed as "0".
  const f = visibleFacts({ beds: listing.beds, baths: listing.baths, sqft: listing.sqft, yearBuilt: listing.year_built });
  const specs = [
    { label: "Beds", value: f.beds },
    { label: "Baths", value: f.baths },
    { label: "Sq Ft", value: f.sqft !== null ? f.sqft.toLocaleString("en-US") : null },
    { label: "Built", value: f.yearBuilt },
  ].filter((s) => s.value !== null);

  const agentPhoto = o.showAgentPhoto && agent.headshot_url ? agent.headshot_url : null;
  const contact = [agent.phone && formatPhone(agent.phone), agent.email].filter(Boolean).join("  ·  ");

  const Specs = ({ dark = false }: { dark?: boolean }) =>
    specs.length > 0 ? (
      <div className="flex items-center justify-center gap-10">
        {specs.map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-serif text-2xl font-bold" style={{ color: dark ? "#fff" : accent }}>{s.value}</p>
            <p className={`text-[10px] font-medium uppercase tracking-widest ${dark ? "text-white/70" : "text-gray-500"}`}>{s.label}</p>
          </div>
        ))}
      </div>
    ) : null;

  const Qr = ({ size = "h-24 w-24", light = false }: { size?: string; light?: boolean }) => (
    <div className="flex-none text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrSrc} alt={qrCaption} className={`${size} rounded-md bg-white p-1`} />
      <p className={`mt-1 text-[10px] uppercase tracking-widest ${light ? "opacity-70" : "text-gray-500"}`}>{qrCaption}</p>
    </div>
  );

  const Description = ({ lines = 8 }: { lines?: number }) =>
    o.showDescription && listing.description ? (
      <p className="flex-1 text-[13px] leading-relaxed text-gray-700" style={{ display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {listing.description}
      </p>
    ) : null;

  const Features = () =>
    features.length > 0 ? (
      <ul className="w-[2.4in] flex-none space-y-1.5 text-[12px] text-gray-700">
        {features.map((feat) => (
          <li key={feat} className="flex items-start gap-2 break-inside-avoid">
            <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full" style={{ backgroundColor: accent }} />
            {feat}
          </li>
        ))}
      </ul>
    ) : null;

  const AgentBlock = ({ light = false }: { light?: boolean }) => (
    <div className="flex min-w-0 flex-1 items-center gap-4">
      {agentPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={agentPhoto} alt={agent.name} loading="eager" className="h-20 w-20 flex-none rounded-full border-2 object-cover" style={{ borderColor: accent }} />
      )}
      <div className="min-w-0">
        <p className="font-serif text-xl font-bold">{agent.name}</p>
        <p className={`text-sm ${light ? "opacity-80" : "text-gray-600"}`}>{[agent.title, agent.brokerage].filter(Boolean).join(" · ")}</p>
        {contact && <p className={`mt-1 text-sm ${light ? "opacity-90" : "text-gray-700"}`}>{contact}</p>}
        {agent.license_number && <p className={`mt-0.5 text-[10px] ${light ? "opacity-60" : "text-gray-500"}`}>License #{agent.license_number}</p>}
      </div>
    </div>
  );

  const page = "relative flex h-[11in] w-[8.5in] flex-col overflow-hidden bg-white text-gray-900 break-inside-avoid print:shadow-none";
  const printColors = { printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } as const;

  if (o.layout === "modern") {
    return (
      <div className={page} style={printColors}>
        <div className="flex flex-none items-end justify-between gap-6 px-10 py-7 text-white" style={{ backgroundColor: accent }}>
          <div className="min-w-0">
            {o.headline && <p className="font-serif text-4xl font-bold leading-tight">{o.headline}</p>}
            {when && <p className="mt-1 text-lg font-medium opacity-95">{when}</p>}
          </div>
          {price && <p className="flex-none font-serif text-3xl font-bold">{price}</p>}
        </div>
        <div className="h-[4.2in] w-full flex-none bg-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {hero && <img src={hero.src} alt={hero.alt || listing.street} loading="eager" className="h-full w-full object-cover" />}
        </div>
        <div className="flex-none border-b border-gray-200 px-10 py-4">
          <p className="text-center text-lg font-medium">{address}</p>
          <div className="mt-3"><Specs /></div>
        </div>
        <div className="flex min-h-0 flex-1 gap-8 overflow-hidden px-10 py-5">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {o.customText && <p className="text-[14px] font-semibold" style={{ color: accent }}>{o.customText}</p>}
            <Description lines={7} />
          </div>
          <Features />
        </div>
        <div className="flex flex-none items-center gap-6 border-t border-gray-200 px-10 py-5">
          <AgentBlock />
          <Qr size="h-28 w-28" />
        </div>
      </div>
    );
  }

  if (o.layout === "minimal") {
    return (
      <div className={page} style={printColors}>
        <div className="flex-none px-12 pt-12">
          <div className="h-[4.6in] w-full overflow-hidden rounded-sm bg-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {hero && <img src={hero.src} alt={hero.alt || listing.street} loading="eager" className="h-full w-full object-cover" />}
          </div>
        </div>
        <div className="flex-none px-12 pt-8 text-center">
          {o.headline && <p className="text-sm font-semibold uppercase tracking-[0.35em]" style={{ color: accent }}>{o.headline}</p>}
          {when && <p className="mt-2 font-serif text-2xl">{when}</p>}
          <p className="mt-4 font-serif text-3xl font-bold">{listing.street}</p>
          <p className="mt-1 text-gray-600">{[listing.city, listing.state].filter(Boolean).join(", ")}{price ? `  ·  ${price}` : ""}</p>
          <div className="mt-5"><Specs /></div>
          {o.customText && <p className="mx-auto mt-5 max-w-[5.5in] text-[14px] text-gray-700">{o.customText}</p>}
        </div>
        <div className="mt-auto flex flex-none items-end gap-6 px-12 pb-10">
          <AgentBlock />
          <Qr size="h-28 w-28" />
        </div>
      </div>
    );
  }

  // classic
  return (
    <div className={page} style={printColors}>
      {/* Hero */}
      <div className="relative h-[4.1in] w-full flex-none bg-gray-200">
        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero.src} alt={hero.alt || listing.street} loading="eager" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
        {o.headline && (
          <div className="absolute left-0 top-8 px-6 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white" style={{ backgroundColor: accent }}>
            {o.headline}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 px-8 pb-6 text-white">
          {when && <p className="mb-1 text-base font-semibold opacity-95">{when}</p>}
          {price && <p className="font-serif text-4xl font-bold">{price}</p>}
          <p className="mt-1 text-lg opacity-95">{address}</p>
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
      {specs.length > 0 && (
        <div className="flex-none border-b border-gray-200 px-8 py-4">
          <Specs />
        </div>
      )}

      {/* Description + features */}
      <div className="flex min-h-0 flex-1 gap-8 overflow-hidden px-8 py-5">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {o.customText && <p className="text-[14px] font-semibold" style={{ color: accent }}>{o.customText}</p>}
          <Description />
        </div>
        <Features />
      </div>

      {/* Footer: agent + QR */}
      <div className="flex flex-none items-center gap-5 px-8 py-5 text-white" style={{ backgroundColor: "#0f172a" }}>
        <AgentBlock light />
        <Qr light />
      </div>
    </div>
  );
}
