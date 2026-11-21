"use client";

// In-browser customizer for the free templates. The download box HTML (src/content/templates.ts) contains a
// placeholder <div data-template-customizer="id">; this component renders into each one. PDFs are built in the
// visitor's browser with the same builders as the published files, so nothing typed here is sent anywhere.

import React, { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { ACCENT_COLORS, BAND_COLORS, PRINT_ONLY, brandingLine, cleanText, flyerColors, resolveTheme } from "@/lib/templateTheme.mjs";

type RGB = [number, number, number];
const css = (c: RGB | null | undefined) => (c ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : "transparent");
const hexToRgb = (hex: string): RGB | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const FLYER_DESIGNS = [
  { id: "classic", name: "Classic" },
  { id: "modern", name: "Modern" },
  { id: "minimal", name: "Minimal" },
];

const inputClass =
  "mt-1 block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-normal text-gray-900 focus:border-[#9a8866] focus:outline-none focus:ring-2 focus:ring-[#9a8866]/30";
const swatchClass =
  "h-7 w-7 rounded-full border border-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a8866] focus-visible:ring-offset-2";

type Props = { id: string; kind: "template" | "flyer"; title: string; subtitle: string; panelTarget?: HTMLElement | null };

function Customizer({ id, kind, title, subtitle, panelTarget }: Props) {
  const uid = useId();
  const flyer = kind === "flyer";
  const [open, setOpen] = useState(false);
  const [design, setDesign] = useState("modern");
  const [band, setBand] = useState<string>("navy");
  const [customHex, setCustomHex] = useState("#1e3a8a");
  const [accent, setAccent] = useState<string>("gold");
  const [accentHex, setAccentHex] = useState("#d4a373");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  // Browsers with a built-in PDF viewer (desktop Chrome, Edge, Firefox, Safari) show the real PDF as a live preview.
  const [inlinePdf] = useState(() => typeof navigator !== "undefined" && (navigator as Navigator & { pdfViewerEnabled?: boolean }).pdfViewerEnabled === true);
  const [heading, setHeading] = useState("");
  const [name, setName] = useState("");
  const [brokerage, setBrokerage] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [fillable, setFillable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canFill = flyer || !PRINT_ONLY.has(id);
  const accents = flyer ? ACCENT_COLORS.filter((c) => c.rgb) : ACCENT_COLORS;

  const bandRgb: RGB = band === "custom" ? hexToRgb(customHex) || [15, 23, 42] : (BAND_COLORS.find((c) => c.id === band)?.rgb as RGB);
  const accentRgb = (accent === "custom" ? hexToRgb(accentHex) || [184, 150, 90] : ACCENT_COLORS.find((c) => c.id === accent)?.rgb ?? null) as RGB | null;
  const theme = band === "navy" && accent === "gold" ? null : { band: bandRgb, accent: accentRgb };
  const contact = [phone, email].map((v) => cleanText(v, 40)).filter(Boolean).join("  ·  ");

  // What the PDF will use, so the preview matches it (including automatic darkening for readability).
  const th = resolveTheme(theme) as { band: RGB; accent: RGB | null; label: RGB; title: RGB; subtitle: RGB; heading: RGB };
  const fc = flyerColors(theme) as { band: RGB; accent: RGB; soft: RGB };
  const shownTitle = (cleanText(heading, flyer ? 24 : 60) || (flyer ? "Open House" : title));
  const brand = brandingLine({ name, brokerage, contact });

  const reset = () => {
    setBand("navy"); setAccent("gold"); setDesign("modern"); setHeading(""); setName(""); setBrokerage(""); setPhone(""); setEmail(""); setFillable(false); setError("");
  };

  const buildPdf = async (): Promise<{ buf: ArrayBuffer; file: string }> => {
      let buf: ArrayBuffer;
      let file: string;
      if (flyer) {
        const F = await import("@/lib/flyerPdf.mjs");
        const build = F.buildFlyerPdf as unknown as (d: string, o: Record<string, unknown>) => ArrayBuffer;
        buf = build(design, { fillable, theme: theme && { band: bandRgb, accent: accentRgb }, prefill: { headline: heading, name, brokerage, phone, email } });
        file = `open-house-flyer-${design}${fillable ? "-fillable" : ""}-custom.pdf`;
      } else {
        const T = await import("@/lib/templatePdf.mjs");
        const model = (T.TEMPLATE_MODELS as Record<string, unknown>)[id];
        if (!model) throw new Error("unknown template");
        const build = T.buildTemplatePdf as unknown as (m: unknown, o: Record<string, unknown>) => ArrayBuffer;
        buf = build(model, { fillable: canFill && fillable, theme, title: heading, branding: { name, brokerage, contact } });
        file = `${id}${canFill && fillable ? "-fillable" : ""}-custom.pdf`;
      }
      return { buf, file };
  };

  // Live preview: rebuild the PDF shortly after each change while the panel is open.
  useEffect(() => {
    if (!open || !inlinePdf) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { buf } = await buildPdf();
        if (cancelled) return;
        const next = URL.createObjectURL(new Blob([buf], { type: "application/pdf" }));
        setPdfUrl((old) => { if (old) URL.revokeObjectURL(old); return next; });
      } catch {
        /* the sketch preview and the download button still work */
      }
    }, 450);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inlinePdf, design, band, customHex, accent, accentHex, heading, name, brokerage, phone, email, fillable]);
  useEffect(() => () => { setPdfUrl((old) => { if (old) URL.revokeObjectURL(old); return null; }); }, []);

  const download = async () => {
    setBusy(true);
    setError("");
    try {
      const { buf, file } = await buildPdf();
      const url = URL.createObjectURL(new Blob([buf], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = file;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      setError("Sorry, the PDF could not be created in this browser. The standard downloads above still work.");
    } finally {
      setBusy(false);
    }
  };

  // The panel opens full width under the preview and downloads when the box has a slot for it.
  const wrapPanel = (node: React.ReactNode) => (panelTarget ? createPortal(node, panelTarget) : node);

  const swatches = (
    <>
      <fieldset>
        <legend className="text-sm font-semibold text-gray-900">{flyer ? "Main color" : "Header color"}</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {BAND_COLORS.map((c) => (
            <button key={c.id} type="button" title={c.name} aria-label={c.name} aria-pressed={band === c.id}
              onClick={() => setBand(c.id)} className={`${swatchClass} ${band === c.id ? "ring-2 ring-gray-900 ring-offset-2" : ""}`}
              style={{ background: css(c.rgb as RGB) }} />
          ))}
          <label className={`inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs font-medium ${band === "custom" ? "border-gray-900 text-gray-900" : "border-gray-300 text-gray-600"}`}>
            <input type="color" value={customHex} aria-label={flyer ? "Custom main color" : "Custom header color"}
              onChange={(e) => { setCustomHex(e.target.value); setBand("custom"); }}
              className="h-4 w-4 cursor-pointer rounded-full border-0 bg-transparent p-0" />
            Custom
          </label>
        </div>
        {flyer && band === "custom" && (
          <div className="mt-1 text-xs text-gray-500">Light colors are deepened so the white text on the flyer stays readable.</div>
        )}
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold text-gray-900">Accent color</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {accents.map((c) => (
            <button key={c.id} type="button" title={c.name} aria-label={c.name} aria-pressed={accent === c.id}
              onClick={() => setAccent(c.id)}
              className={`${swatchClass} ${accent === c.id ? "ring-2 ring-gray-900 ring-offset-2" : ""} ${c.rgb ? "" : "bg-[repeating-linear-gradient(45deg,#fff,#fff_3px,#e5e7eb_3px,#e5e7eb_6px)]"}`}
              style={c.rgb ? { background: css(c.rgb as RGB) } : undefined} />
          ))}
          <label className={`inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs font-medium ${accent === "custom" ? "border-gray-900 text-gray-900" : "border-gray-300 text-gray-600"}`}>
            <input type="color" value={accentHex} aria-label="Custom accent color"
              onChange={(e) => { setAccentHex(e.target.value); setAccent("custom"); }}
              className="h-4 w-4 cursor-pointer rounded-full border-0 bg-transparent p-0" />
            Custom
          </label>
        </div>
      </fieldset>
    </>
  );

  const preview = flyer ? (
    <div className="mx-auto w-full max-w-[220px] overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm" aria-hidden="true">
      {design === "minimal" ? (
        <div className="px-3 pt-3">
          <div className="h-16 rounded-sm bg-gray-100" />
          <div className="mt-2 text-center font-serif text-sm font-bold text-gray-900">{shownTitle}</div>
          <div className="mx-auto mt-1 h-px w-8" style={{ background: css(fc.accent) }} />
        </div>
      ) : (
        <>
          <div className="px-3 py-2" style={{ background: css(fc.band) }}>
            <div className="text-[7px] font-bold tracking-[0.12em]" style={{ color: css(fc.soft) }}>OPEN HOUSE FLYER</div>
            <div className="truncate text-[13px] font-extrabold uppercase leading-tight text-white">{shownTitle}</div>
          </div>
          <div className="h-[3px]" style={{ background: css(fc.accent) }} />
          <div className="mx-3 mt-2 h-14 rounded-sm bg-gray-100" />
        </>
      )}
      <div className="space-y-1.5 px-3 py-2">
        <div className="h-1.5 w-2/3 rounded bg-gray-200" />
        <div className="flex gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className="h-3 flex-1 rounded-sm text-center text-[5px] font-bold" style={{ color: css(fc.accent), background: "#f8f6f1" }}>•</div>)}</div>
      </div>
      <div className={`px-3 py-1.5 text-[7px] ${design === "minimal" ? "border-t text-gray-700" : "text-white"}`}
        style={design === "minimal" ? { borderColor: css(fc.accent) } : { background: css(fc.band), borderTop: `2px solid ${css(fc.accent)}` }}>
        <div className="truncate font-semibold">{cleanText(name, 40) || "Agent name"}</div>
        <div className="truncate opacity-80">{[cleanText(brokerage, 40), contact].filter(Boolean).join(" · ") || "Brokerage · phone · email"}</div>
      </div>
    </div>
  ) : (
    <div className="overflow-hidden rounded-md border border-gray-200 shadow-sm" aria-hidden="true">
      <div className="px-3 pb-2.5 pt-2" style={{ background: css(th.band) }}>
        <div className="text-[8px] font-bold tracking-[0.12em]" style={{ color: css(th.label) }}>FREE TEMPLATE · LISTINGFLARE</div>
        <div className="mt-1 truncate text-[15px] font-extrabold uppercase leading-tight" style={{ color: css(th.title) }}>{shownTitle}</div>
        <div className="mt-1 line-clamp-2 text-[9px] leading-snug" style={{ color: css(th.subtitle) }}>{subtitle}</div>
        {brand && <div className="mt-1 truncate text-[9px] font-bold" style={{ color: css(th.title) }}>{brand}</div>}
      </div>
      <div className="h-[3px]" style={{ background: css(th.accent) }} />
      <div className="space-y-2 bg-white px-3 py-3">
        <div className="text-[11px] font-bold" style={{ color: css(th.heading) }}>Section heading</div>
        <div className="h-px bg-gray-200" />
        <div className="h-1.5 w-3/4 rounded bg-gray-200" />
        <div className="h-1.5 w-1/2 rounded bg-gray-200" />
        <div className="h-1.5 w-2/3 rounded bg-gray-200" />
      </div>
    </div>
  );

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`${uid}-panel`}
        className="inline-flex items-center gap-2 rounded-lg border border-[#9a8866] bg-white px-4 py-2 text-sm font-semibold text-[#75634a] transition-colors hover:bg-[#f3efe6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a8866] focus-visible:ring-offset-2"
      >
        <span aria-hidden="true" className="flex">
          <span className="h-3 w-3 rounded-full" style={{ background: css(flyer ? fc.band : bandRgb) }} />
          <span className="-ml-1 h-3 w-3 rounded-full border border-white" style={{ background: css(accentRgb) || "#ddd" }} />
        </span>
        {open ? "Hide customizer" : flyer ? "Customize a flyer: colors, headline and your details" : "Customize colors and details"}
      </button>

      {open && wrapPanel(
        <div id={`${uid}-panel`} className="mt-3 rounded-lg border border-[#ddd8c8] bg-white p-4 text-left">
          <div className={`grid gap-5 ${inlinePdf ? "md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" : "md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]"}`}>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Preview</div>
              {inlinePdf ? (
                <>
                  <div className="mt-2 overflow-hidden rounded-md border border-gray-200 bg-gray-50 shadow-sm">
                    {pdfUrl ? (
                      <iframe title="Live preview of your customized PDF" src={pdfUrl + "#toolbar=0&navpanes=0&view=FitH"} className="block w-full" style={{ aspectRatio: "8.5 / 11" }} />
                    ) : (
                      <div className="flex w-full items-center justify-center text-sm text-gray-500" style={{ aspectRatio: "8.5 / 11" }}>Building your preview…</div>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                    <span>This is the actual PDF, updated as you make changes.</span>
                    {pdfUrl && <a href={pdfUrl} target="_blank" rel="noopener" className="font-medium text-[#75634a] underline underline-offset-2">Open full size</a>}
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-2">{preview}</div>
                  <div className="mt-2 text-xs text-gray-500">
                    {flyer
                      ? "A sketch of your choices. The flyer keeps the same layout as the free download, with blanks for the event details and photo space."
                      : "The rest of the template keeps the same wording and layout as the standard PDF."}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4">
              {flyer && (
                <fieldset>
                  <legend className="text-sm font-semibold text-gray-900">Design</legend>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {FLYER_DESIGNS.map((d) => (
                      <button key={d.id} type="button" aria-pressed={design === d.id} onClick={() => setDesign(d.id)}
                        className={`rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a8866] ${design === d.id ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
                        {d.name}
                      </button>
                    ))}
                  </div>
                  {design === "minimal" && <div className="mt-1 text-xs text-gray-500">Minimal is mostly white, so it uses the accent color only.</div>}
                </fieldset>
              )}

              {swatches}

              <label className="block text-sm font-semibold text-gray-900">
                {flyer ? "Headline" : "Title"}
                <input className={inputClass} value={heading} maxLength={flyer ? 24 : 60} placeholder={flyer ? "Open House (or Just Listed, Price Improved…)" : title} onChange={(e) => setHeading(e.target.value)} />
              </label>

              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Your details <span className="font-normal text-gray-500">(optional, {flyer ? "printed in the contact bar" : "shown in the header"})</span>
                </div>
                <div className="mt-1 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-gray-600">Name<input className={inputClass} value={name} maxLength={40} autoComplete="name" onChange={(e) => setName(e.target.value)} /></label>
                  <label className="text-xs text-gray-600">Brokerage<input className={inputClass} value={brokerage} maxLength={40} autoComplete="organization" onChange={(e) => setBrokerage(e.target.value)} /></label>
                  <label className="text-xs text-gray-600">Phone<input className={inputClass} value={phone} maxLength={30} type="tel" autoComplete="tel" onChange={(e) => setPhone(e.target.value)} /></label>
                  <label className="text-xs text-gray-600">Email<input className={inputClass} value={email} maxLength={40} type="email" autoComplete="email" onChange={(e) => setEmail(e.target.value)} /></label>
                </div>
              </div>

              {canFill && (
                <fieldset>
                  <legend className="text-sm font-semibold text-gray-900">Version</legend>
                  <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-700">
                    <label className="inline-flex items-center gap-2"><input type="radio" name={`${uid}-v`} checked={!fillable} onChange={() => setFillable(false)} /> Printable</label>
                    <label className="inline-flex items-center gap-2"><input type="radio" name={`${uid}-v`} checked={fillable} onChange={() => setFillable(true)} /> Fillable (type on screen)</label>
                  </div>
                </fieldset>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={download} disabled={busy}
                  className="rounded-lg bg-[#9a8866] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#857454] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a8866] focus-visible:ring-offset-2">
                  {busy ? "Creating your PDF…" : "Download my PDF"}
                </button>
                <button type="button" onClick={reset} className="text-sm font-medium text-gray-600 underline underline-offset-2 hover:text-gray-900">Reset</button>
              </div>
              {error && <div role="alert" className="text-sm text-red-700">{error}</div>}
              <div className="text-xs text-gray-500">
                Made in your browser: nothing you type here is sent to ListingFlare or anyone else. US Letter, free, no sign-up. For bigger changes, use the Word version.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/** Renders a customizer into every template placeholder on the page. */
export default function TemplateCustomizerMount() {
  const [targets, setTargets] = useState<HTMLElement[]>([]);
  useEffect(() => {
    setTargets(Array.from(document.querySelectorAll<HTMLElement>("[data-template-customizer]")));
  }, []);
  return (
    <>
      {targets.map((el, i) =>
        createPortal(
          <Customizer
            panelTarget={el.closest("[data-template-box]")?.querySelector<HTMLElement>("[data-customizer-panel]") ?? null}
            id={el.dataset.templateCustomizer || ""}
            kind={el.dataset.kind === "flyer" ? "flyer" : "template"}
            title={el.dataset.title || ""}
            subtitle={el.dataset.subtitle || ""}
          />,
          el,
          `${el.dataset.templateCustomizer}-${i}`
        )
      )}
    </>
  );
}
