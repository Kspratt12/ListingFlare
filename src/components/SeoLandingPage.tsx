import Link from "next/link";
import NavAuthCta from "@/components/NavAuthCta";
import { ArrowRight, Check } from "lucide-react";

export interface LandingSection {
  heading: string;
  body: string[];
}

export interface LandingStep {
  title: string;
  text: string;
}

export interface LandingFaq {
  question: string;
  answer: string;
}

export interface LandingLink {
  href: string;
  label: string;
}

export interface SeoLandingPageProps {
  path: string;
  eyebrow: string;
  h1: string;
  intro: string;
  highlights: string[];
  sections: LandingSection[];
  // Optional side-by-side table shown after the sections (comparison pages)
  comparison?: { heading: string; columns: string[]; rows: string[][]; note?: string };
  stepsHeading: string;
  steps: LandingStep[];
  limits: { heading: string; items: string[] };
  faqs: LandingFaq[];
  related: LandingLink[];
}

const baseUrl = "https://www.listingflare.com";

// Shared layout for the product landing pages. Content lives in each page file
// so the pages stay distinct; this only holds structure and structured data.
export default function SeoLandingPage({
  path,
  eyebrow,
  h1,
  intro,
  highlights,
  sections,
  comparison,
  stepsHeading,
  steps,
  limits,
  faqs,
  related,
}: SeoLandingPageProps) {
  const url = `${baseUrl}${path}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ListingFlare", item: baseUrl },
      { "@type": "ListItem", position: 2, name: h1, item: url },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="font-serif text-xl font-bold text-gray-900">
            Listing<span className="text-brand-500">Flare</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="hidden text-sm text-gray-500 hover:text-gray-900 sm:block">
              Pricing
            </Link>
            <NavAuthCta className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600" label="Start Free Trial" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-14 md:py-20">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">{eyebrow}</p>
        <h1 className="mt-3 font-serif text-4xl font-bold text-gray-900 md:text-5xl">{h1}</h1>
        <p className="mt-5 max-w-3xl text-lg text-gray-600">{intro}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-full bg-gray-950 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            Start your 14-day free trial
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center rounded-full border border-gray-200 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            See the live demo
          </Link>
        </div>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {highlights.map((h) => (
            <li key={h} className="flex items-start gap-2 text-sm text-gray-700">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-500" />
              {h}
            </li>
          ))}
        </ul>

        {sections.map((s) => (
          <section key={s.heading} className="mt-14">
            <h2 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">{s.heading}</h2>
            {s.body.map((p) => (
              <p key={p} className="mt-4 text-base leading-relaxed text-gray-600">
                {p}
              </p>
            ))}
          </section>
        ))}

        {comparison && (
          <section className="mt-14">
            <h2 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">{comparison.heading}</h2>
            <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-900">
                  <tr>
                    {comparison.columns.map((c) => (
                      <th key={c} className="px-4 py-3 font-semibold">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-600">
                  {comparison.rows.map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell, i) => (
                        <td key={i} className={`px-4 py-3 align-top ${i === 0 ? "font-medium text-gray-900" : ""}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {comparison.note && <p className="mt-3 text-xs text-gray-500">{comparison.note}</p>}
          </section>
        )}

        <section className="mt-14">
          <h2 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">{stepsHeading}</h2>
          <ol className="mt-6 space-y-5">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14 rounded-2xl border border-gray-200 bg-gray-50 p-6 md:p-8">
          <h2 className="font-serif text-2xl font-bold text-gray-900">{limits.heading}</h2>
          <ul className="mt-4 space-y-2">
            {limits.items.map((item) => (
              <li key={item} className="text-sm leading-relaxed text-gray-600">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">Frequently asked questions</h2>
          <div className="mt-6 divide-y divide-gray-100">
            {faqs.map((f) => (
              <div key={f.question} className="py-5">
                <h3 className="font-semibold text-gray-900">{f.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 border-t border-gray-100 pt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Keep reading</h2>
          <ul className="mt-4 space-y-2">
            {related.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                  {l.label} &rarr;
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-gray-100 bg-white py-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <Link href="/" aria-label="ListingFlare home" className="font-serif text-lg font-bold text-gray-900">
            Listing<span className="text-brand-500">Flare</span>
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-gray-500">
            <Link href="/blog" className="hover:text-gray-900">Blog</Link>
            <Link href="/pricing" className="hover:text-gray-900">Pricing</Link>
            <Link href="/about" className="hover:text-gray-900">About</Link>
            <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900">Terms</Link>
            <span>&copy; {new Date().getFullYear()} ListingFlare</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
