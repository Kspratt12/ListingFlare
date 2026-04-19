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

// One row (label → value). Rows flow inside a CSS columns layout so the
// column breaks are even without us having to balance by hand.
function DetailRow({ row }: { row: Row }) {
  return (
    <div className="flex items-baseline justify-between gap-4 break-inside-avoid py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">{row.label}</dt>
      <dd className="text-right text-sm font-semibold text-gray-900">{row.value}</dd>
    </div>
  );
}

// Section inside the single stat sheet — small icon + title on the left,
// rows flowing in a 2-column layout on the right. Each section is
// separated by a hairline divider, no individual card wrappers.
function StatSection({
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
    <div className="border-t border-gray-200 first:border-t-0">
      <div className="grid gap-6 px-6 py-6 md:grid-cols-[200px_1fr] md:gap-10 md:px-8 md:py-8">
        <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-2">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
            style={{
              background: "color-mix(in srgb, var(--agent-brand, #b8965a) 14%, white)",
            }}
          >
            <Icon className="h-4 w-4" style={{ color: "var(--agent-brand, #b8965a)" }} />
          </div>
          <div>
            <h3 className="font-serif text-base font-semibold text-gray-900 md:text-lg">{title}</h3>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">
              {visible.length} {visible.length === 1 ? "detail" : "details"}
            </p>
          </div>
        </div>
        <dl className="md:columns-2 md:gap-10">
          {visible.map((row) => (
            <DetailRow key={row.label} row={row} />
          ))}
        </dl>
      </div>
    </div>
  );
}

// Auto-hides any section with zero populated fields so agents who don't
// fill everything don't see empty rows. Rendered as a single stat sheet —
// one panel with elegant section dividers — rather than a grid of cards,
// which felt too "dashboard-y" for a luxury MLS-style listing.
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
      <div className="relative mx-auto max-w-4xl px-6">
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

        {/* Single stat sheet — one elegant panel, sections separated by
            hairline dividers. No more orphan-card awkwardness, no more
            dashboard-widget feel. Top and bottom edges get a subtle
            brand-tinted accent line to give it a premium brochure feel. */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm shadow-gray-200/40">
          <div
            className="h-1 w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, var(--agent-brand, #b8965a) 20%, var(--agent-brand, #b8965a) 80%, transparent 100%)",
            }}
          />
          <StatSection title="General" icon={Home} rows={generalRows} />
          <StatSection title="Costs" icon={Info} rows={costRows} />
          <StatSection title="Interior" icon={Sofa} rows={interiorRows} />
          <StatSection title="Systems" icon={Thermometer} rows={systemsRows} />
          <StatSection title="Construction" icon={Hammer} rows={constructionRows} />
        </div>

        {appliances && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Appliances Included</h3>
            </div>
            <div className="flex flex-wrap gap-2 px-6 py-4">
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
