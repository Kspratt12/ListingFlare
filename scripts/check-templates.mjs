// Checks the downloadable templates in public/downloads.
//
//   node scripts/check-templates.mjs
//
// Exits with a non-zero code if anything is wrong. Reads the list of files from
// src/content/templates.ts so a file cannot be linked and missing.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import JSZip from "jszip"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const registry = fs.readFileSync(path.join(ROOT, "src/content/templates.ts"), "utf8")
// Files are listed either as literal hrefs or through the pdf(), fillable() and word() helpers.
const hrefs = [
  ...[...registry.matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]),
  ...[...registry.matchAll(/\bpdf\("([^"]+)"\)/g)].map((m) => `/downloads/${m[1]}.pdf`),
  ...[...registry.matchAll(/\bfillable\("([^"]+)"\)/g)].map((m) => `/downloads/${m[1]}-fillable.pdf`),
  ...[...registry.matchAll(/\bword\("([^"]+)"\)/g)].map((m) => `/downloads/${m[1]}.docx`),
]
const SENTINELS = {
  "real-estate-listing-presentation-template": ["LISTING PRESENTATION", "About you", "Pricing recommendation", "Marketing plan", "Next steps"],
  "open-house-sign-in-sheet-template": ["OPEN HOUSE SIGN-IN SHEET", "Property address", "Consent wording", "Has agent"],
  "seller-update-report-template": ["SELLER UPDATE REPORT", "Activity this period", "Showing feedback", "Recommendation and next steps"],
  "single-property-website-template": ["SINGLE PROPERTY WEBSITE", "Property basics", "Questions buyers ask", "Call to action", "Fair housing"],
  "listing-marketing-plan-template": ["LISTING MARKETING PLAN", "Pricing and timeline", "Marketing activities", "Acknowledgement"],
  "pre-listing-checklist-template": ["PRE-LISTING CHECKLIST", "Paperwork", "Home preparation", "Go live"],
  "real-estate-lead-response-scripts": ["LEAD RESPONSE SCRIPTS", "After-hours auto-reply", "Before you send"],
  "listing-faq-worksheet": ["LISTING FAQ WORKSHEET", "Cost and terms", "Showing and offers"],
  "lead-follow-up-tracker": ["LEAD FOLLOW-UP TRACKER", "Lead name", "Next step"],
  "open-house-checklist-template": ["OPEN HOUSE CHECKLIST", "A week before", "At the open house", "After"],
}

let failures = 0
const fail = (msg) => { failures++; console.log("FAIL", msg) }
const ok = (cond, msg) => { if (!cond) fail(msg) }

ok(hrefs.length >= 18, "registry lists the template files")
ok(new Set(hrefs).size === hrefs.length, "registry has duplicate hrefs")

for (const href of hrefs) {
  const file = path.join(ROOT, "public", href.replace(/^\//, ""))
  if (!fs.existsSync(file)) { fail(href + " is missing"); continue }
  const size = fs.statSync(file).size
  ok(size > 2000 && size < 300 * 1024, href + " has a sensible size (" + size + ")")
  const id = Object.keys(SENTINELS).find((k) => href.includes(k))
  ok(!!id, href + " belongs to a known template")
  const buf = fs.readFileSync(file)

  if (href.endsWith(".pdf")) {
    const text = buf.toString("latin1")
    ok(text.startsWith("%PDF-"), href + " is a PDF")
    ok(/\/MediaBox\s*\[\s*0\.?0*\s+0\.?0*\s+612\.?0*\s+792\.?0*\s*\]/.test(text), href + " is US Letter")
    ok(text.includes("not legal advice") && text.includes("ListingFlare"), href + " has the footer")
    for (const s of SENTINELS[id] || []) ok(text.includes(s), href + " is missing: " + s)
    const fills = [...text.matchAll(/([\d.]+ [\d.]+ [\d.]+) rg\n[^\n]* re\nB\n/g)].map((m) => m[1])
    if (/\/Type\s*\/Page[^s]/.test(text) && (text.match(/ re\nB\n/g) || []).length) {
      ok(fills.length > 0 && fills.every((c) => c === "0.93 0.94 0.96"), href + " table headers are light grey")
    }
    const widgets = (text.match(/\/Subtype\s*\/Widget/g) || []).length
    if (href.includes("-fillable")) {
      ok(text.includes("/AcroForm") && widgets > 10, href + " has a form with many fields")
      const names = [...text.matchAll(/\/T\s*\(([^)]*)\)/g)].map((m) => m[1])
      ok(new Set(names).size === names.length, href + " has duplicate field names")
      ok(!/\/AS\s*\/On/.test(text), href + " has a checkbox that starts ticked")
      for (const m of text.matchAll(/\/Rect\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/g)) {
        const [x1, y1, x2, y2] = m.slice(1).map(Number)
        ok(x1 >= 0 && y1 >= 0 && x2 <= 612 && y2 <= 792 && x2 > x1 && y2 > y1, href + " has a field outside the page")
      }
    } else {
      ok(widgets === 0, href + " should not have form fields")
    }
  } else if (href.endsWith(".docx")) {
    const zip = await JSZip.loadAsync(buf)
    for (const part of ["[Content_Types].xml", "_rels/.rels", "word/document.xml"]) ok(zip.file(part), href + " lacks " + part)
    const doc = await zip.file("word/document.xml").async("string")
    ok(doc.trimEnd().endsWith("</w:document>"), href + " document.xml is cut short")
    ok(/<w:pgSz[^>]*w:w="12240"[^>]*w:h="15840"/.test(doc), href + " is US Letter")
    const text = [...doc.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join(" ")
    for (const s of SENTINELS[id] || []) ok(text.includes(s), href + " is missing: " + s)
    const opens = (doc.match(/<w:tbl>/g) || []).length, closes = (doc.match(/<\/w:tbl>/g) || []).length
    ok(opens === closes && opens > 0, href + " has unbalanced tables")
  }
}

// Every download an article embeds must come from the registry.
const articlesDir = path.join(ROOT, "src/content/articles")
for (const f of fs.readdirSync(articlesDir)) {
  const src = fs.readFileSync(path.join(articlesDir, f), "utf8")
  for (const m of src.matchAll(/downloadBox\("([^"]+)"\)/g)) ok(registry.includes('id: "' + m[1] + '"'), f + " uses unknown template " + m[1])
}

console.log(failures ? "\n" + failures + " problem(s)" : "\nAll " + hrefs.length + " template files passed")
process.exit(failures ? 1 : 0)
