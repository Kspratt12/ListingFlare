// Builds the free downloadable templates in public/downloads/.
//
//   node scripts/build-templates.mjs
//
// The generated files are committed, so this only needs to run when the
// template wording changes. Needs the jspdf and docx dev dependencies.
//
// Content mirrors the published articles:
//   /blog/real-estate-listing-presentation-template
//   /blog/open-house-sign-in-sheet-template
//   /blog/seller-update-report-template
//   /blog/single-property-website-template
//   /blog/open-house-checklist
//   /blog/listing-marketing-plan-template
//   /blog/pre-listing-checklist

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import JSZip from "jszip"
import { FLYER_DESIGNS, buildFlyerDocx, buildFlyerPdf } from "./flyer-designs.mjs"
import * as T from "../src/lib/templatePdf.mjs"
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, AlignmentType, Footer, PageNumber, PageBreak,
} from "docx"

const OUT = process.env.OUT_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "downloads")
fs.mkdirSync(OUT, { recursive: true })

// Template content and the PDF builder live in src/lib/templatePdf.mjs (shared with the blog customizer).
const { FOOTER, listingPresentation, openHouseSignIn, openHouseFlyer, buyerQuestionnaire, sellerUpdate, propertyWebsite, openHouseChecklist, marketingPlan, preListing, leadResponseScripts, listingFaqWorksheet, leadFollowUpTracker } = T
const buildPdf = (model, opts) => Buffer.from(T.buildTemplatePdf(model, opts))

// ───────────────────────── DOCX ─────────────────────────

const TW = 10240 // content width in twips (US Letter, 1000 twip margins)
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
const noBorders = { top: NONE, bottom: NONE, left: NONE, right: NONE }
const lineBorder = { style: BorderStyle.SINGLE, size: 4, color: "999999" }
const gridBorder = { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" }

function run(text, o = {}) { return new TextRun({ text, font: "Calibri", ...o }) }

function buildDocx(model) {
  const kids = []
  kids.push(new Paragraph({ spacing: { after: 60 }, children: [run(model.title.toUpperCase(), { bold: true, size: 40 })] }))
  kids.push(new Paragraph({
    spacing: { after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "9A8866", space: 4 } },
    children: [run(model.subtitle, { size: 18, color: "6E6E78" })],
  }))

  for (const b of model.blocks) {
    if (b.t === "h2") {
      kids.push(new Paragraph({
        spacing: { before: 240, after: 100 }, keepNext: true,
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "D2D2DC", space: 2 } },
        children: [run(b.text, { bold: true, size: 22 })],
      }))
    } else if (b.t === "para") {
      kids.push(new Paragraph({ spacing: { after: 100 }, children: [run(b.text, { size: 19 })] }))
    } else if (b.t === "note") {
      kids.push(new Paragraph({ spacing: { after: 100 }, children: [run(b.text, { size: 17, italics: true, color: "6E6E78" })] }))
    } else if (b.t === "fields") {
      const rows = b.rows.map((row) => {
        const cells = []
        if (row.length === 2) {
          row.forEach((label) => {
            cells.push(new TableCell({ width: { size: 1900, type: WidthType.DXA }, borders: noBorders, margins: { top: 90, bottom: 40 },
              children: [new Paragraph({ children: [run(label, { bold: true, size: 17, color: "6E6E78" })] })] }))
            cells.push(new TableCell({ width: { size: 3220, type: WidthType.DXA }, borders: { ...noBorders, bottom: lineBorder }, margins: { top: 90, bottom: 40 },
              children: [new Paragraph({ children: [run(" ", { size: 19 })] })] }))
          })
        } else {
          cells.push(new TableCell({ width: { size: 1900, type: WidthType.DXA }, borders: noBorders, margins: { top: 90, bottom: 40 },
            children: [new Paragraph({ children: [run(row[0], { bold: true, size: 17, color: "6E6E78" })] })] }))
          cells.push(new TableCell({ width: { size: 8340, type: WidthType.DXA }, columnSpan: 3, borders: { ...noBorders, bottom: lineBorder }, margins: { top: 90, bottom: 40 },
            children: [new Paragraph({ children: [run(" ", { size: 19 })] })] }))
        }
        return new TableRow({ cantSplit: true, children: cells })
      })
      kids.push(new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: [1900, 3220, 1900, 3220], borders: { ...noBorders, insideHorizontal: NONE, insideVertical: NONE }, rows }))
    } else if (b.t === "lines") {
      for (let i = 0; i < b.n; i++) {
        kids.push(new Paragraph({ spacing: { before: 120, after: 20 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 1 } }, children: [run(" ", { size: 19 })] }))
      }
    } else if (b.t === "bullets" || b.t === "checks") {
      for (const item of b.items) {
        kids.push(new Paragraph({ spacing: { after: 40 }, indent: { left: 360, hanging: 360 }, children: [run(b.t === "checks" ? "☐\t" : "•\t", { size: 19 }), run(item, { size: 19 })] }))
      }
    } else if (b.t === "table") {
      const total = b.cols.reduce((s, c) => s + c[1], 0)
      const widths = b.cols.map((c) => Math.round((c[1] / total) * TW))
      const head = new TableRow({ tableHeader: true, cantSplit: true, children: b.cols.map((c, i) => new TableCell({
        width: { size: widths[i], type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: "auto", fill: "EEF0F6" },
        borders: { top: gridBorder, bottom: gridBorder, left: gridBorder, right: gridBorder },
        children: [new Paragraph({ children: [run(c[0], { bold: true, size: 17 })] })],
      })) })
      const body = Array.from({ length: b.rows }, () => new TableRow({ cantSplit: true, height: { value: 400, rule: "atLeast" }, children: widths.map((w) => new TableCell({
        width: { size: w, type: WidthType.DXA }, borders: { top: gridBorder, bottom: gridBorder, left: gridBorder, right: gridBorder },
        children: [new Paragraph({ children: [run(" ", { size: 19 })] })],
      })) }))
      kids.push(new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: widths, rows: [head, ...body] }))
      kids.push(new Paragraph({ spacing: { after: 60 }, children: [] }))
    } else if (b.t === "pagebreak") {
      kids.push(new Paragraph({ children: [new PageBreak()] }))
    }
  }

  const doc = new Document({
    creator: "ListingFlare",
    title: model.title,
    description: "Free template from ListingFlare",
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
        run(FOOTER + "   Page ", { size: 14, color: "969696" }),
        new TextRun({ children: [PageNumber.CURRENT], size: 14, color: "969696", font: "Calibri" }),
        run(" of ", { size: 14, color: "969696" }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: "969696", font: "Calibri" }),
      ] })] }) },
      children: kids,
    }],
  })
  return Packer.toBuffer(doc)
}

// ───────────────────────── spreadsheet ─────────────────────────
// A plain .xlsx written by hand (it is a zip of XML parts), so it opens in Excel and imports into Google Sheets.

const xmlEsc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

async function buildSignInXlsx() {
  const COLS = ["A", "B", "C", "D", "E"]
  const HEADERS = ["Name", "Phone", "Email", "Has agent? (Y/N)", "Notes"]
  const WIDTHS = [28, 18, 32, 18, 36]
  const cell = (ref, text, style) => `<c r="${ref}"${style ? ` s="${style}"` : ""} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(text)}</t></is></c>`
  const blank = (ref, style) => `<c r="${ref}" s="${style}"/>`
  const rows = []
  rows.push(`<row r="1" ht="24" customHeight="1">${cell("A1", "OPEN HOUSE SIGN-IN SHEET", 3)}</row>`)
  rows.push(`<row r="2">${cell("A2", "Property address", 4)}${blank("B2", 2)}${blank("C2", 2)}</row>`)
  rows.push(`<row r="3">${cell("A3", "Open house date", 4)}${blank("B3", 2)}${cell("C3", "Hosted by", 4)}${blank("D3", 2)}</row>`)
  rows.push(`<row r="4">${cell("A4", "Consent wording to edit and place here (example): By signing in, I agree that the host may contact me about this property. Check your brokerage's rules, and the rules where you work, before you use it. This is general guidance, not legal advice.", 5)}</row>`)
  rows.push(`<row r="6">${HEADERS.map((h, i) => cell(COLS[i] + "6", h, 1)).join("")}</row>`)
  for (let r = 7; r <= 36; r++) rows.push(`<row r="${r}" ht="22" customHeight="1">${COLS.map((c) => blank(c + r, 2)).join("")}</row>`)
  rows.push(`<row r="38">${cell("A38", "Visitors choose what to share. Do not require contact details to enter, and keep the sheet covered so visitors cannot read each other's details.", 5)}</row>`)
  rows.push(`<row r="39">${cell("A39", "Free template from ListingFlare (listingflare.com). General guidance, not legal advice.", 5)}</row>`)

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:E39"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${WIDTHS.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${rows.join("")}</sheetData><pageMargins left="0.5" right="0.5" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font><font><i/><sz val="9"/><color rgb="FF646464"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEDEFF5"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBBBBBB"/></left><right style="thin"><color rgb="FFBBBBBB"/></right><top style="thin"><color rgb="FFBBBBBB"/></top><bottom style="thin"><color rgb="FFBBBBBB"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`

  const zip = new JSZip()
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`)
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)
  zip.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sign-in sheet" sheetId="1" r:id="rId1"/></sheets></workbook>`)
  zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)
  zip.file("xl/worksheets/sheet1.xml", sheet)
  zip.file("xl/styles.xml", styles)
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
}

// Lead follow-up tracker as an .xlsx (same hand-written package as the sign-in sheet).
async function buildTrackerXlsx() {
  const COLS = ["A", "B", "C", "D", "E", "F", "G", "H"]
  const HEADERS = ["Lead name", "Source", "First reply (time)", "Day 1", "Day 3", "Day 7", "Status", "Next step"]
  const WIDTHS = [24, 16, 18, 12, 12, 12, 18, 30]
  const cell = (ref, text, style) => `<c r="${ref}"${style ? ` s="${style}"` : ""} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(text)}</t></is></c>`
  const blank = (ref, style) => `<c r="${ref}" s="${style}"/>`
  const rows = []
  rows.push(`<row r="1" ht="24" customHeight="1">${cell("A1", "LEAD FOLLOW-UP TRACKER", 3)}</row>`)
  rows.push(`<row r="2">${cell("A2", "Listing or campaign", 4)}${blank("B2", 2)}${blank("C2", 2)}${cell("D2", "Week of", 4)}${blank("E2", 2)}</row>`)
  rows.push(`<row r="3">${cell("A3", "One row per lead. The goal is simple: no lead goes more than a day without a note on what happens next.", 5)}</row>`)
  rows.push(`<row r="5">${HEADERS.map((h, i) => cell(COLS[i] + "5", h, 1)).join("")}</row>`)
  for (let r = 6; r <= 40; r++) rows.push(`<row r="${r}" ht="22" customHeight="1">${COLS.map((c) => blank(c + r, 2)).join("")}</row>`)
  rows.push(`<row r="42">${cell("A42", "Status ideas: new, replied, showing booked, toured, offer stage, not interested. Record only what you need, and remove people who ask you to stop.", 5)}</row>`)
  rows.push(`<row r="43">${cell("A43", "Free template from ListingFlare (listingflare.com). General guidance, not legal advice.", 5)}</row>`)
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:H43"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${WIDTHS.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${rows.join("")}</sheetData><pageMargins left="0.5" right="0.5" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font><font><i/><sz val="9"/><color rgb="FF646464"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEDEFF5"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBBBBBB"/></left><right style="thin"><color rgb="FFBBBBBB"/></right><top style="thin"><color rgb="FFBBBBBB"/></top><bottom style="thin"><color rgb="FFBBBBBB"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
  const zip = new JSZip()
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`)
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)
  zip.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Lead tracker" sheetId="1" r:id="rId1"/></sheets></workbook>`)
  zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)
  zip.file("xl/worksheets/sheet1.xml", sheet)
  zip.file("xl/styles.xml", styles)
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
}

// ───────────────────────── write ─────────────────────────

const ONLY = process.env.ONLY || ""
const write = (name, buf) => { if (ONLY && !name.startsWith(ONLY)) return; fs.writeFileSync(path.join(OUT, name), buf); console.log(name.padEnd(54), (buf.length / 1024).toFixed(1) + " KB") }

for (const model of [listingPresentation, sellerUpdate, propertyWebsite, marketingPlan, leadResponseScripts, listingFaqWorksheet, leadFollowUpTracker]) {
  write(`${model.file}.pdf`, buildPdf(model))
  write(`${model.file}-fillable.pdf`, buildPdf(model, { fillable: true }))
  write(`${model.file}.docx`, await buildDocx(model))
}
// The sign-in sheet is printed and filled in by hand, so it has no fillable version.
write(`${openHouseSignIn.file}.pdf`, buildPdf(openHouseSignIn))
write(`${openHouseSignIn.file}.docx`, await buildDocx(openHouseSignIn))
// Checklists are printed and ticked by hand, so they have no fillable version.
for (const model of [openHouseChecklist, preListing]) {
  write(`${model.file}.pdf`, buildPdf(model))
  write(`${model.file}.docx`, await buildDocx(model))
}

// New: open house flyer template and the spreadsheet version of the sign-in sheet.
// Open house flyer in three designs. Modern keeps the original file names (existing links).
for (const design of FLYER_DESIGNS) {
  const base = design === "modern" ? openHouseFlyer.file : `${openHouseFlyer.file}-${design}`
  write(`${base}.pdf`, buildFlyerPdf(design))
  write(`${base}-fillable.pdf`, buildFlyerPdf(design, { fillable: true }))
  write(`${base}.docx`, await buildFlyerDocx(design))
}
write(`${openHouseSignIn.file}.xlsx`, await buildSignInXlsx())

// New: buyer questionnaire template and the spreadsheet version of the lead follow-up tracker.
write(`${buyerQuestionnaire.file}.pdf`, buildPdf(buyerQuestionnaire))
write(`${buyerQuestionnaire.file}-fillable.pdf`, buildPdf(buyerQuestionnaire, { fillable: true }))
write(`${buyerQuestionnaire.file}.docx`, await buildDocx(buyerQuestionnaire))
write(`${leadFollowUpTracker.file}.xlsx`, await buildTrackerXlsx())
