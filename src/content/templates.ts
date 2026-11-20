/**
 * Free downloadable templates. The files live in public/downloads and are built
 * by scripts/build-templates.mjs. Articles embed them with downloadBox(), the
 * templates page lists them, and scripts/check-templates.mjs checks that every
 * file here exists and is valid.
 */

export interface TemplateFile {
  label: string;
  href: string;
  note: string;
}

export interface Template {
  id: string;
  title: string;
  description: string;
  /** The guide that explains how to use it. */
  guideHref: string;
  guideLabel: string;
  files: TemplateFile[];
  /**
   * Optional designs shown as a gallery. Previews (public/templates) are page 1 rendered with fictional
   * sample text and original illustrations; the downloads themselves are blank.
   */
  designs?: TemplateDesign[];
}

export interface TemplateDesign {
  name: string;
  blurb: string;
  files: TemplateFile[];
  preview: { src: string; alt: string; width: number; height: number };
}

const pdf = (id: string) => ({ label: "PDF", href: `/downloads/${id}.pdf`, note: "Print and fill in by hand" });
const fillable = (id: string) => ({ label: "Fillable PDF", href: `/downloads/${id}-fillable.pdf`, note: "Type into it on screen, then save or print" });
const word = (id: string) => ({ label: "Word", href: `/downloads/${id}.docx`, note: "Edit on your computer" });
// The Modern flyer design keeps the original file names, so links shared before the gallery keep working.
const FLYER_MODERN_FILES = [pdf("open-house-flyer-template"), fillable("open-house-flyer-template"), word("open-house-flyer-template")];

export const TEMPLATES: Template[] = [
  {
    id: "real-estate-listing-presentation-template",
    title: "Listing presentation template",
    description:
      "Agent details, seller goals, comparable homes, pricing, a marketing plan checklist, communication plan, fees and next steps.",
    guideHref: "/blog/real-estate-listing-presentation-template",
    guideLabel: "How to fill it in",
    files: [pdf("real-estate-listing-presentation-template"), fillable("real-estate-listing-presentation-template"), word("real-estate-listing-presentation-template")],
  },
  {
    id: "listing-marketing-plan-template",
    title: "Listing marketing plan template",
    description:
      "A one-to-two page plan for a seller: goals, pricing and timeline, marketing activities, online and in-person steps, and how you will report progress.",
    guideHref: "/blog/listing-marketing-plan-template",
    guideLabel: "How to write the plan",
    files: [pdf("listing-marketing-plan-template"), fillable("listing-marketing-plan-template"), word("listing-marketing-plan-template")],
  },
  {
    id: "single-property-website-template",
    title: "Single property website content template",
    description:
      "Everything to gather before you build a page for one listing: basics, headline, description, features, neighborhood, media, buyer questions and call to action.",
    guideHref: "/blog/single-property-website-template",
    guideLabel: "How to use it",
    files: [pdf("single-property-website-template"), fillable("single-property-website-template"), word("single-property-website-template")],
  },
  {
    id: "pre-listing-checklist-template",
    title: "Pre-listing checklist",
    description:
      "Paperwork, pricing, home preparation, photos and media, marketing setup and go-live steps to finish before a listing goes live.",
    guideHref: "/blog/pre-listing-checklist",
    guideLabel: "How to use the checklist",
    files: [
      { label: "PDF", href: "/downloads/pre-listing-checklist-template.pdf", note: "Print and tick off by hand" },
      word("pre-listing-checklist-template"),
    ],
  },
  {
    id: "open-house-checklist-template",
    title: "Open house checklist",
    description: "What to do a week before, the day before, at the open house and afterward, with a spot for your brokerage's safety guidance.",
    guideHref: "/blog/open-house-checklist",
    guideLabel: "How to run the day",
    files: [
      { label: "PDF", href: "/downloads/open-house-checklist-template.pdf", note: "Print and tick off by hand" },
      word("open-house-checklist-template"),
    ],
  },
  {
    id: "open-house-sign-in-sheet-template",
    title: "Open house sign-in sheet",
    description:
      "A printable one-page sign-in sheet with room for a consent line, name, phone, email, whether the visitor has an agent, and notes.",
    guideHref: "/blog/open-house-sign-in-sheet-template",
    guideLabel: "What to put on it",
    files: [
      { label: "PDF", href: "/downloads/open-house-sign-in-sheet-template.pdf", note: "Print and keep at the door" },
      { label: "Word", href: "/downloads/open-house-sign-in-sheet-template.docx", note: "Edit the wording first" },
      { label: "Excel / Google Sheets", href: "/downloads/open-house-sign-in-sheet-template.xlsx", note: "Type into it, or import it into Google Sheets" },
    ],
  },
  {
    id: "open-house-flyer-template",
    title: "Open house flyer templates",
    description:
      "Three designs laid out like finished flyers, ready to fill in, print or edit. Each has the event details, price and facts, photo space, highlights and a contact bar with a QR code square, plus a before-you-print checklist on page 2.",
    guideHref: "/blog/open-house-flyer-template",
    guideLabel: "How to use it",
    // Modern keeps the original file names, so existing links keep working.
    files: FLYER_MODERN_FILES,
    designs: [
      {
        name: "Classic",
        blurb: "Full-width photo with an Open House banner, a strip of three photos, facts, a short description and highlights.",
        files: [pdf("open-house-flyer-template-classic"), fillable("open-house-flyer-template-classic"), word("open-house-flyer-template-classic")],
        preview: {
          src: "/templates/open-house-flyer-classic-preview.jpg",
          alt: "Classic open house flyer template sample: large house photo with a gold Open House banner, date, time, price and address band, three room photos, home facts, description, highlights and an agent contact bar with a QR code",
          width: 826,
          height: 1069,
        },
      },
      {
        name: "Modern",
        blurb: "Navy headline band with the date and time, one large photo, price and address, fact tiles and highlights.",
        files: FLYER_MODERN_FILES,
        preview: {
          src: "/templates/open-house-flyer-modern-preview.jpg",
          alt: "Modern open house flyer template sample: navy Open House headline band with date and time, large house photo, price and address, four fact tiles, highlights and an agent contact bar with a QR code",
          width: 826,
          height: 1069,
        },
      },
      {
        name: "Minimal",
        blurb: "White space, one photo and large type, with the event details centered and a light contact section.",
        files: [pdf("open-house-flyer-template-minimal"), fillable("open-house-flyer-template-minimal"), word("open-house-flyer-template-minimal")],
        preview: {
          src: "/templates/open-house-flyer-minimal-preview.jpg",
          alt: "Minimal open house flyer template sample: house photo, centered Open House title in serif type, date and time, street address, city and price, home facts, a short message and contact details with a QR code",
          width: 826,
          height: 1069,
        },
      },
    ],
  },
  {
    id: "seller-update-report-template",
    title: "Seller update report",
    description:
      "A short weekly update for a listing's seller: activity, showing feedback, what you did, nearby market activity and your recommendation.",
    guideHref: "/blog/seller-update-report-template",
    guideLabel: "How to write the update",
    files: [pdf("seller-update-report-template"), fillable("seller-update-report-template"), word("seller-update-report-template")],
  },
  {
    id: "real-estate-lead-response-scripts",
    title: "Lead response scripts",
    description:
      "Edit-and-paste first replies for text and email, an after-hours auto-reply, a voicemail script, showing confirmations and day 3 and day 7 check-ins.",
    guideHref: "/blog/how-to-respond-to-real-estate-leads",
    guideLabel: "How to respond to leads",
    files: [pdf("real-estate-lead-response-scripts"), fillable("real-estate-lead-response-scripts"), word("real-estate-lead-response-scripts")],
  },
  {
    id: "listing-faq-worksheet",
    title: "Listing FAQ worksheet",
    description:
      "The questions buyers ask most, with blanks for your answers. Fill it in before you publish so your listing page and AI chat give accurate answers.",
    guideHref: "/blog/listing-faq-questions-buyers-ask",
    guideLabel: "Why it matters",
    files: [pdf("listing-faq-worksheet"), fillable("listing-faq-worksheet"), word("listing-faq-worksheet")],
  },
  {
    id: "lead-follow-up-tracker",
    title: "Lead follow-up tracker",
    description:
      "A one-page tracker for each lead's first reply time, day 1, day 3 and day 7 touches, status and next step.",
    guideHref: "/blog/real-estate-lead-nurture-campaign",
    guideLabel: "How to nurture leads",
    files: [
      pdf("lead-follow-up-tracker"),
      fillable("lead-follow-up-tracker"),
      word("lead-follow-up-tracker"),
      { label: "Excel / Google Sheets", href: "/downloads/lead-follow-up-tracker.xlsx", note: "Type into it, or import it into Google Sheets" },
    ],
  },
  {
    id: "real-estate-buyer-questionnaire-template",
    title: "Buyer questionnaire",
    description:
      "An intake form for a new buyer: contact details, timeline, budget and financing, the home they want, working with an agent, showings and a fair housing reminder.",
    guideHref: "/blog/real-estate-buyer-questionnaire",
    guideLabel: "How to use it",
    files: [pdf("real-estate-buyer-questionnaire-template"), fillable("real-estate-buyer-questionnaire-template"), word("real-estate-buyer-questionnaire-template")],
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function fileButton(f: TemplateFile, compact = false): string {
  const style = compact
    ? "display:block;margin:0 0 6px;padding:8px 10px;border-radius:8px;background:#9a8866;color:#ffffff;font-weight:600;font-size:13px;text-decoration:none;text-align:center;"
    : "display:inline-block;margin:0 8px 8px 0;padding:10px 16px;border-radius:8px;background:#9a8866;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;";
  return (
    '<a href="' + f.href + '" download style="' + style + '">Download ' + f.label +
    '<span style="display:block;font-size:11px;font-weight:400;opacity:0.9;">' + f.note + "</span></a>"
  );
}

const FILLABLE_NOTE =
  '<div style="margin-top:6px;font-size:12px;color:#6b7280;">Fillable PDF: open it in a PDF reader such as Adobe Acrobat Reader to type into the blanks. Some phone and browser previews cannot.</div>';
const GENERAL_NOTE =
  '<div style="margin-top:6px;font-size:12px;color:#6b7280;">No email or sign-up needed. General guidance, not legal advice. Adjust it to your brokerage&rsquo;s and local requirements.</div>';

/** One card per design: a sample preview (linked to that design's printable PDF) and its own downloads. */
function designCard(d: TemplateDesign): string {
  const printable = d.files.find((f) => f.label === "PDF") || d.files[0];
  return (
    '<div style="min-width:0;padding:10px;border:1px solid #ddd8c8;border-radius:10px;background:#ffffff;">' +
    '<a href="' + printable.href + '" aria-label="' + esc(d.name + " design: open the printable PDF") + '" style="display:block;">' +
    '<img src="' + d.preview.src + '" alt="' + esc(d.preview.alt) + '" width="' + d.preview.width + '" height="' + d.preview.height +
    '" loading="lazy" decoding="async" style="display:block;width:100%;height:auto;aspect-ratio:' + d.preview.width + " / " + d.preview.height +
    ';border:1px solid #ddd8c8;border-radius:6px;box-shadow:0 4px 14px rgba(15,23,42,0.14);" />' +
    "</a>" +
    '<div style="margin-top:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#eceae3;color:#374151;font-size:11px;font-weight:600;">Sample preview</span></div>' +
    '<div style="margin:4px 0 2px;font-size:16px;font-weight:700;color:#111827;">' + d.name + "</div>" +
    '<div style="margin:0 0 10px;font-size:13px;color:#4b5563;">' + d.blurb + "</div>" +
    d.files.map((f) => fileButton(f, true)).join("") +
    "</div>"
  );
}

/** HTML for the free-download box used inside article content and on the templates page. */
export function downloadBox(id: string): string {
  const t = getTemplate(id);
  if (!t) throw new Error("Unknown template id: " + id);
  const all = t.designs ? t.designs.flatMap((d) => d.files) : t.files;
  const hasFillable = all.some((f) => f.label === "Fillable PDF");
  const header =
    '<div style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#75634a;">Free download</div>' +
    '<div style="margin-top:4px;font-size:18px;font-weight:700;color:#111827;">' + t.title + "</div>" +
    '<div style="margin:4px 0 14px;font-size:14px;color:#4b5563;">' + t.description + "</div>";
  const open = '<div style="margin:24px 0;padding:20px;border:1px solid #ddd8c8;border-radius:12px;background:#f8f7f4;">';
  if (t.designs) {
    return (
      open +
      header +
      '<div style="margin:0 0 12px;font-size:13px;font-weight:600;color:#374151;">US Letter 8.5 &times; 11 in &middot; PDF, fillable PDF and Word &middot; Free downloads, no sign-up</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;">' + t.designs.map(designCard).join("") + "</div>" +
      '<div style="margin-top:12px;font-size:12px;color:#6b7280;">Previews show fictional sample text and illustrations, not a real property or agent. The downloads are blank, ready for your own details and photos.</div>' +
      (hasFillable ? FILLABLE_NOTE : "") +
      GENERAL_NOTE +
      '<div style="margin-top:10px;font-size:13px;color:#374151;">Rather build it from a listing? <a href="/signup" style="color:#75634a;font-weight:600;">Customize a flyer online in ListingFlare</a>. That needs a ListingFlare account; the 14-day free trial needs no credit card.</div>' +
      "</div>"
    );
  }
  return open + header + "<div>" + t.files.map((f) => fileButton(f)).join("") + "</div>" + (hasFillable ? FILLABLE_NOTE : "") + GENERAL_NOTE + "</div>";
}
