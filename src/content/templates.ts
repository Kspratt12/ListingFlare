/**
 * Free downloadable templates. The files live in public/downloads and are built
 * by scripts/build-templates.mjs. Articles embed them with downloadBox(), and
 * scripts/check-templates.mjs checks that every file here exists and is valid.
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
  files: TemplateFile[];
}

export const TEMPLATES: Template[] = [
  {
    id: "real-estate-listing-presentation-template",
    title: "Listing presentation template",
    description:
      "Agent details, seller goals, comparable homes, pricing, a marketing plan checklist, communication plan, fees and next steps.",
    files: [
      { label: "PDF", href: "/downloads/real-estate-listing-presentation-template.pdf", note: "Print and fill in by hand" },
      { label: "Fillable PDF", href: "/downloads/real-estate-listing-presentation-template-fillable.pdf", note: "Type into it on screen, then save or print" },
      { label: "Word", href: "/downloads/real-estate-listing-presentation-template.docx", note: "Edit on your computer" },
    ],
  },
  {
    id: "open-house-sign-in-sheet-template",
    title: "Open house sign-in sheet",
    description:
      "A printable one-page sign-in sheet with room for a consent line, name, phone, email, whether the visitor has an agent, and notes.",
    files: [
      { label: "PDF", href: "/downloads/open-house-sign-in-sheet-template.pdf", note: "Print and keep at the door" },
      { label: "Word", href: "/downloads/open-house-sign-in-sheet-template.docx", note: "Edit the wording first" },
    ],
  },
  {
    id: "seller-update-report-template",
    title: "Seller update report",
    description:
      "A short weekly update for a listing's seller: activity, showing feedback, what you did, nearby market activity and your recommendation.",
    files: [
      { label: "PDF", href: "/downloads/seller-update-report-template.pdf", note: "Print and fill in by hand" },
      { label: "Fillable PDF", href: "/downloads/seller-update-report-template-fillable.pdf", note: "Type into it on screen, then save or print" },
      { label: "Word", href: "/downloads/seller-update-report-template.docx", note: "Edit on your computer" },
    ],
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** HTML for the free-download box used inside article content. */
export function downloadBox(id: string): string {
  const t = getTemplate(id);
  if (!t) throw new Error("Unknown template id: " + id);
  const buttons = t.files
    .map(
      (f) =>
        '<a href="' + f.href + '" download style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;border-radius:8px;background:#9a8866;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;">Download ' +
        f.label +
        '<span style="display:block;font-size:11px;font-weight:400;opacity:0.9;">' +
        f.note +
        "</span></a>"
    )
    .join("");
  const hasFillable = t.files.some((f) => f.label === "Fillable PDF");
  return (
    '<div style="margin:24px 0;padding:20px;border:1px solid #ddd8c8;border-radius:12px;background:#f8f7f4;">' +
    '<div style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#75634a;">Free download</div>' +
    '<div style="margin-top:4px;font-size:18px;font-weight:700;color:#111827;">' +
    t.title +
    "</div>" +
    '<div style="margin:4px 0 14px;font-size:14px;color:#4b5563;">' +
    t.description +
    "</div>" +
    "<div>" +
    buttons +
    "</div>" +
    (hasFillable
      ? '<div style="margin-top:6px;font-size:12px;color:#6b7280;">Fillable PDF: open it in a PDF reader such as Adobe Acrobat Reader to type into the blanks. Some phone and browser previews cannot.</div>'
      : "") +
    '<div style="margin-top:6px;font-size:12px;color:#6b7280;">No email or sign-up needed. General guidance, not legal advice. Adjust it to your brokerage&rsquo;s and local requirements.</div>' +
    "</div>"
  );
}
