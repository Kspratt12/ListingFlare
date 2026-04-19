"use client";

import { Home, Thermometer, Hammer, Info, Sofa } from "lucide-react";

interface Props {
  // General
  propertySubtype?: string | null;
  architecturalStyle?: string | null;
  yearBuilt?: number | null;
  stories?: number | null;
  lotSize?: string | null;
  county?: string | null;
  subdivision?: string | null;
  mlsId?: string | null;
  parkingSpaces?: number | null;
  parcelNumber?: string | null;
  // Price per sqft (computed in caller)
  pricePerSqft?: number | null;
  sqft?: number | null;
  // Costs
  propertyTaxAnnual?: number | null;
  hoaRequired?: boolean;
  hoaFeeMonthly?: number | null;
  // Systems
  heatingType?: string | null;
  coolingType?: string | null;
  waterSource?: string | null;
  sewerType?: string | null;
  // Construction
  roofType?: string | null;
  constructionMaterial?: string | null;
  foundationType?: string | null;
  // Interior
  fireplaceCount?: number | null;
  laundryLocation?: string | null;
  basementType?: string | null;
  // Appliances
  appliances?: string[];
}

function formatMoney(n: number | null | undefined): string | null {
  if (n == null) return null;
  return `$${Math.round(n).toLocaleString()}`;
}

interface Row {
  label: string;
  value: string | null | undefined;
}

function Section({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  rows: Row[];
}) {
  const visible = rows.filter((r) => r.value);
  if (visible.length === 0) return null;
  return (
    <div className="group relative snap-start overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm shadow-gray-200/60 transition-all duration-500 hover:-translate-y-1 hover:border-brand-300 hover:shadow-2xl hover:shadow-gray-300/50">
      {/* Top accent stripe in brand color */}
      <div
        className="h-1 w-full"
        style={{ background: "linear-gradient(90deg, transparent 0%, var(--agent-brand, #b8965a) 20%, var(--agent-brand, #b8965a) 80%, transparent 100%)" }}
      />
      {/* Subtle corner glow in brand color */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20"
        style={{ backgroundColor: "var(--agent-brand, #b8965a)" }}
      />

      <div className="relative flex items-center gap-4 border-b border-gray-100 px-6 py-5">
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl shadow-inner transition-transform duration-500 group-hover:scale-110"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--agent-brand, #b8965a) 14%, white) 0%, color-mix(in srgb, var(--agent-brand, #b8965a) 22%, white) 100%)",
          }}
        >
          <Icon className="h-5 w-5" style={{ color: "var(--agent-brand, #b8965a)" }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-lg font-semibold leading-tight text-gray-900">{title}</h3>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">
            {visible.length} {visible.length === 1 ? "detail" : "details"}
          </p>
        </div>
      </div>
      <dl className="divide-y divide-gray-100 bg-gradient-to-b from-white to-gray-50/40">
        {visible.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 px-6 py-3.5 transition-colors hover:bg-white">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">{row.label}</dt>
            <dd className="text-right text-sm font-bold text-gray-900">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// Auto-hides any section with zero populated fields so agents who don't
// fill everything don't see empty cards.
export default function PropertyAttributes(props: Props) {
  const generalRows: Row[] = [
    { label: "Property Type", value: props.propertySubtype || null },
    { label: "Style", value: props.architecturalStyle || null },
    { label: "Year Built", value: props.yearBuilt ? String(props.yearBuilt) : null },
    { label: "Stories", value: props.stories ? String(props.stories) : null },
    { label: "Lot Size", value: props.lotSize || null },
    { label: "County", value: props.county || null },
    { label: "Subdivision", value: props.subdivision || null },
    { label: "MLS ID", value: props.mlsId || null },
    { label: "Parcel Number", value: props.parcelNumber || null },
    { label: "Parking Spaces", value: props.parkingSpaces ? String(props.parkingSpaces) : null },
  ];

  const costRows: Row[] = [
    { label: "Price per Sqft", value: props.pricePerSqft ? `$${props.pricePerSqft.toLocaleString()}` : null },
    { label: "Annual Property Tax", value: formatMoney(props.propertyTaxAnnual) },
    {
      label: "HOA",
      value:
        props.hoaRequired === false && props.hoaFeeMonthly == null
          ? "No HOA"
          : props.hoaFeeMonthly
            ? `${formatMoney(props.hoaFeeMonthly)}/mo`
            : null,
    },
  ];

  const interiorRows: Row[] = [
    { label: "Fireplaces", value: props.fireplaceCount ? String(props.fireplaceCount) : null },
    { label: "Laundry", value: props.laundryLocation || null },
    { label: "Basement", value: props.basementType || null },
  ];

  const systemsRows: Row[] = [
    { label: "Heating", value: props.heatingType || null },
    { label: "Cooling", value: props.coolingType || null },
    { label: "Water", value: props.waterSource || null },
    { label: "Sewer", value: props.sewerType || null },
  ];

  const constructionRows: Row[] = [
    { label: "Roof", value: props.roofType || null },
    { label: "Construction", value: props.constructionMaterial || null },
    { label: "Foundation", value: props.foundationType || null },
  ];

  const allRows = [...generalRows, ...costRows, ...systemsRows, ...constructionRows, ...interiorRows];
  if (allRows.every((r) => !r.value)) return null;

  const appliances = props.appliances && props.appliances.length > 0;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 via-white to-gray-50 py-14 md:py-20">
      {/* Decorative backdrop tinted by the brand color */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(ellipse at top, var(--agent-brand, #b8965a) 0%, transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-5xl px-6">
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-px w-20"
            style={{ background: "linear-gradient(90deg, transparent, var(--agent-brand, #b8965a), transparent)" }}
          />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-700">
            The Details
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-4xl">
            Full property details
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">
            Everything you&apos;d find on the MLS sheet, laid out cleanly.
          </p>
        </div>

        {/* Mobile: horizontal swipe carousel with snap-scroll.
            Desktop: 2-column grid. */}
        <div className="mt-8 -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-6 pb-4 md:mx-0 md:grid md:snap-none md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="w-[85%] flex-shrink-0 md:w-auto"><Section title="General" icon={Home} rows={generalRows} /></div>
          <div className="w-[85%] flex-shrink-0 md:w-auto"><Section title="Costs" icon={Info} rows={costRows} /></div>
          <div className="w-[85%] flex-shrink-0 md:w-auto"><Section title="Interior" icon={Sofa} rows={interiorRows} /></div>
          <div className="w-[85%] flex-shrink-0 md:w-auto"><Section title="Systems" icon={Thermometer} rows={systemsRows} /></div>
          <div className="w-[85%] flex-shrink-0 md:w-auto"><Section title="Construction" icon={Hammer} rows={constructionRows} /></div>
        </div>
        <p className="mt-2 text-center text-[11px] text-gray-400 md:hidden">Swipe to see all details →</p>

        {appliances && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Appliances Included</h3>
            </div>
            <div className="flex flex-wrap gap-2 px-5 py-4">
              {props.appliances!.map((a) => (
                <span key={a} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
