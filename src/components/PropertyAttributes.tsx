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
  icon: React.ComponentType<{ className?: string }>;
  rows: Row[];
}) {
  const visible = rows.filter((r) => r.value);
  if (visible.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-5 py-3">
        <Icon className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <dl className="divide-y divide-gray-100">
        {visible.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 px-5 py-3">
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">{row.label}</dt>
            <dd className="text-right text-sm font-medium text-gray-900">{row.value}</dd>
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
    <section className="bg-gray-50 py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            The Details
          </p>
          <h2 className="mt-2 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
            Full property details
          </h2>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Section title="General" icon={Home} rows={generalRows} />
          <Section title="Costs" icon={Info} rows={costRows} />
          <Section title="Interior" icon={Sofa} rows={interiorRows} />
          <Section title="Systems" icon={Thermometer} rows={systemsRows} />
          <Section title="Construction" icon={Hammer} rows={constructionRows} />
        </div>

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
