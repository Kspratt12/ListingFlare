// Open house flyer designs (Classic, Modern, Minimal) for the free template downloads.
// Used by scripts/build-templates.mjs (blank printable, fillable and Word files) and by the preview
// renderer (sample mode: fictional text and illustrations, never part of the downloads).
//
// Every design: page 1 is the flyer, page 2 is the same fill-in guidance and before-you-print list.
// Fillable fields on dark backgrounds sit on white input boxes, because jsPDF writes no per-field text
// colour (typed text is always black).
import { FLYER_DESIGNS, FLYER_FOOTER, SAMPLE, buildFlyerPdf as buildFlyerPdfShared } from "../src/lib/flyerPdf.mjs"

export { FLYER_DESIGNS, FLYER_FOOTER, SAMPLE }
export const buildFlyerPdf = (design, opts) => Buffer.from(buildFlyerPdfShared(design, opts))
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, AlignmentType, Footer, PageNumber, PageBreak,
} from "docx"



// ---------------- Word ----------------
const TW = 10240
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
const noBorders = { top: NONE, bottom: NONE, left: NONE, right: NONE }
const gridBorder = { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" }
const lineBorder = { style: BorderStyle.SINGLE, size: 4, color: "999999" }
const run = (text, o = {}) => new TextRun({ text, font: "Calibri", ...o })
const p = (text, o = {}, po = {}) => new Paragraph({ ...po, children: [run(text, o)] })
const HX = { NAVY: "0F172A", GOLD: "B8965A", TILE: "F8F6F1", PHOTO: "F1F3F7", SOFT: "BEAF8C" }
const table = (widths, rows) => new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, borders: { ...noBorders, insideHorizontal: NONE, insideVertical: NONE }, rows })
const cell = (children, o = {}) => new TableCell({ borders: noBorders, margins: { top: 80, bottom: 80, left: 140, right: 140 }, ...o, children })
const shade = (fill) => ({ type: ShadingType.CLEAR, color: "auto", fill })
const photoCell = (height, big, width) => new TableCell({
  ...(width ? { width: { size: width, type: WidthType.DXA } } : {}),
  shading: shade(HX.PHOTO), verticalAlign: "center", borders: { top: gridBorder, bottom: gridBorder, left: gridBorder, right: gridBorder },
  children: big
    ? [p("Your best exterior or living-room photo", { size: 22, color: "6E6E78" }, { alignment: AlignmentType.CENTER }), p("Click here and use Insert > Pictures. Delete this text after you add the photo.", { size: 16, color: "8C8C96" }, { alignment: AlignmentType.CENTER })]
    : [p("Photo", { size: 16, color: "8C8C96" }, { alignment: AlignmentType.CENTER })],
})
const photoRow = (height, cells) => new TableRow({ height: { value: height, rule: "exact" }, children: cells })
const navyLabelRow = (labels) => table(labels.map((l) => l[1]), [new TableRow({ children: labels.map(([lab, w]) => cell([p(lab.toUpperCase(), { bold: true, size: 14, color: HX.GOLD }), p(" ", { size: 20, color: "FFFFFF" })], { width: { size: w, type: WidthType.DXA }, shading: shade(HX.NAVY), borders: { ...noBorders, bottom: { style: BorderStyle.SINGLE, size: 4, color: "7882A0" } } })) })])
const tilesRow = (style) => {
  const tileW = style === "tiles" ? 2420 : 2560, gap = style === "tiles" ? 186 : 0
  const tile = (lab) => new TableCell({ width: { size: tileW, type: WidthType.DXA }, margins: { top: 120, bottom: 80 },
    ...(style === "tiles" ? { shading: shade(HX.TILE), borders: { top: { style: BorderStyle.SINGLE, size: 4, color: "E1D7C3" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "E1D7C3" }, left: { style: BorderStyle.SINGLE, size: 4, color: "E1D7C3" }, right: { style: BorderStyle.SINGLE, size: 4, color: "E1D7C3" } } } : { borders: { ...noBorders, left: { style: BorderStyle.SINGLE, size: 4, color: "D2D2DC" } } }),
    children: [p(" ", { size: 30, bold: true }, { alignment: AlignmentType.CENTER }), p(lab.toUpperCase(), { bold: true, size: 14, color: HX.GOLD }, { alignment: AlignmentType.CENTER })] })
  const facts = ["Beds", "Baths", "Square feet", "Year built"]
  if (!gap) return table(facts.map(() => tileW), [new TableRow({ children: facts.map(tile) })])
  const spacer = () => new TableCell({ width: { size: gap, type: WidthType.DXA }, borders: noBorders, children: [p(" ")] })
  return table([tileW, gap, tileW, gap, tileW, gap, tileW], [new TableRow({ children: [tile(facts[0]), spacer(), tile(facts[1]), spacer(), tile(facts[2]), spacer(), tile(facts[3])] })])
}
const bulletLines = (count) => Array.from({ length: count }, () => new Paragraph({ spacing: { before: 80, after: 20 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "C8C8D0", space: 1 } }, children: [run("•  ", { size: 20, color: HX.GOLD, bold: true }), run(" ", { size: 20 })] }))
const plainLines = (count) => Array.from({ length: count }, () => new Paragraph({ spacing: { before: 100, after: 20 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "C8C8D0", space: 1 } }, children: [run(" ", { size: 20 })] }))
const contactTable = (dark) => {
  const lab = (t) => p(`${t.toUpperCase()}:  `, { bold: true, size: 15, color: dark ? HX.GOLD : "8A7350" }, { spacing: { after: 80 } })
  const c = (children, w) => cell(children, { width: { size: w, type: WidthType.DXA }, ...(dark ? { shading: shade(HX.NAVY) } : {}) })
  const qrInner = new Table({ width: { size: 1700, type: WidthType.DXA }, columnWidths: [1700], rows: [new TableRow({ height: { value: 1500, rule: "exact" }, children: [new TableCell({ shading: shade("FFFFFF"), verticalAlign: "center", borders: dark ? undefined : { top: gridBorder, bottom: gridBorder, left: gridBorder, right: gridBorder }, children: [p("Your QR code", { size: 14, color: "6E6E78" }, { alignment: AlignmentType.CENTER })] })] })] })
  return new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: [3900, 3900, 2440], borders: dark ? { ...noBorders, insideHorizontal: NONE, insideVertical: NONE } : { ...noBorders, top: { style: BorderStyle.SINGLE, size: 8, color: HX.GOLD }, insideHorizontal: NONE, insideVertical: NONE }, rows: [
    new TableRow({ children: [
      c([lab("Agent"), lab("Phone"), lab("QR link")], 3900),
      c([lab("Brokerage"), lab("Email"), p("License # / disclosures:", { size: 13, color: dark ? "A0AAC0" : "6E6E78" })], 3900),
      c([qrInner, p("SCAN FOR PHOTOS & DETAILS", { bold: true, size: 12, color: HX.GOLD })], 2440),
    ] }),
  ] })
}
const spacerP = (after = 120) => new Paragraph({ spacing: { after }, children: [] })

export function buildFlyerDocx(design) {
  const kids = []
  if (design === "modern") {
    kids.push(table([TW], [new TableRow({ children: [cell([
      p("OPEN HOUSE FLYER · EVENT AND PRICE", { bold: true, size: 14, color: HX.SOFT }),
      p("OPEN HOUSE", { bold: true, size: 64, color: "FFFFFF" }, { spacing: { before: 60, after: 60 } }),
      p("Change the headline if you like: Just Listed, Price Improved, Coming Soon.", { size: 15, color: "A0AAC0", italics: true }),
    ], { shading: shade(HX.NAVY), margins: { top: 200, bottom: 120, left: 240, right: 240 } })] })]))
    kids.push(navyLabelRow([["Date", 5120], ["Time", 5120]]))
    kids.push(new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 24, color: HX.GOLD, space: 0 } }, spacing: { after: 120 }, children: [] }))
    kids.push(new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: [TW], rows: [photoRow(4600, [photoCell(4600, true)])] }))
    kids.push(spacerP(60))
    const labelled = (lab, w, size) => cell([p(lab.toUpperCase(), { bold: true, size: 14, color: "6E6E78" }), p(" ", { size })], { width: { size: w, type: WidthType.DXA }, borders: { ...noBorders, bottom: lineBorder } })
    kids.push(table([3600, 400, 6240], [new TableRow({ children: [labelled("Price", 3600, 32), cell([p(" ")], { width: { size: 400, type: WidthType.DXA } }), labelled("Property address", 6240, 24)] })]))
    kids.push(spacerP(100))
    kids.push(tilesRow("tiles"))
    kids.push(p("Highlights", { bold: true, size: 22 }, { spacing: { before: 200, after: 60 } }))
    kids.push(...bulletLines(4))
    kids.push(spacerP(160))
    kids.push(contactTable(true))
  } else if (design === "classic") {
    kids.push(table([2900, TW - 2900], [new TableRow({ children: [
      cell([p("OPEN HOUSE", { bold: true, size: 30, color: "FFFFFF" })], { width: { size: 2900, type: WidthType.DXA }, shading: shade(HX.GOLD) }),
      cell([p("Change the headline if you like: Just Listed, Price Improved.", { size: 15, color: "8C8C96", italics: true })], { width: { size: TW - 2900, type: WidthType.DXA } }),
    ] })]))
    kids.push(new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: [TW], rows: [photoRow(4300, [photoCell(4300, true)])] }))
    kids.push(table([TW], [new TableRow({ children: [cell([p("OPEN HOUSE FLYER · EVENT AND PRICE", { bold: true, size: 13, color: HX.SOFT })], { shading: shade(HX.NAVY) })] })]))
    kids.push(navyLabelRow([["Date", 3400], ["Time", 2800], ["Price", 4040]]))
    kids.push(navyLabelRow([["Address", TW]]))
    kids.push(new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: [3413, 3413, 3414], rows: [photoRow(1700, [photoCell(1700, false, 3413), photoCell(1700, false, 3413), photoCell(1700, false, 3414)])] }))
    kids.push(spacerP(100))
    kids.push(tilesRow("line"))
    kids.push(spacerP(80))
    kids.push(table([5020, 200, 5020], [new TableRow({ children: [
      cell([p("About this home", { bold: true, size: 22 }), ...plainLines(4)], { width: { size: 5020, type: WidthType.DXA } }),
      cell([p(" ")], { width: { size: 200, type: WidthType.DXA } }),
      cell([p("Highlights", { bold: true, size: 22 }), ...bulletLines(4)], { width: { size: 5020, type: WidthType.DXA } }),
    ] })]))
    kids.push(spacerP(120))
    kids.push(contactTable(true))
  } else {
    kids.push(new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: [TW], rows: [photoRow(4700, [photoCell(4700, true)])] }))
    kids.push(p("OPEN HOUSE FLYER · EVENT AND PRICE", { bold: true, size: 14, color: HX.GOLD }, { alignment: AlignmentType.CENTER, spacing: { before: 240 } }))
    kids.push(p("Open House", { bold: true, size: 52, font: "Georgia" }, { alignment: AlignmentType.CENTER, spacing: { before: 60, after: 120 } }))
    kids.push(table([1300, 3700, 400, 1100, 3740], [new TableRow({ children: [
      cell([p("DATE", { bold: true, size: 14, color: "6E6E78" })], { width: { size: 1300, type: WidthType.DXA } }),
      cell([p(" ")], { width: { size: 3700, type: WidthType.DXA }, borders: { ...noBorders, bottom: lineBorder } }),
      cell([p(" ")], { width: { size: 400, type: WidthType.DXA } }),
      cell([p("TIME", { bold: true, size: 14, color: "6E6E78" })], { width: { size: 1100, type: WidthType.DXA } }),
      cell([p(" ")], { width: { size: 3740, type: WidthType.DXA }, borders: { ...noBorders, bottom: lineBorder } }),
    ] })]))
    kids.push(p("PROPERTY ADDRESS", { bold: true, size: 14, color: "6E6E78" }, { alignment: AlignmentType.CENTER, spacing: { before: 240 } }))
    kids.push(...plainLines(1))
    kids.push(p("CITY · PRICE", { bold: true, size: 14, color: "6E6E78" }, { alignment: AlignmentType.CENTER, spacing: { before: 200 } }))
    kids.push(...plainLines(1))
    kids.push(spacerP(160))
    kids.push(tilesRow("line"))
    kids.push(p("SHORT MESSAGE (OPTIONAL)", { bold: true, size: 13, color: "6E6E78" }, { alignment: AlignmentType.CENTER, spacing: { before: 200 } }))
    kids.push(...plainLines(1))
    kids.push(spacerP(240))
    kids.push(contactTable(false))
  }

  // page 2 guidance
  kids.push(new Paragraph({ children: [new PageBreak()] }))
  kids.push(p("OPEN HOUSE FLYER: HOW TO FILL IT IN", { bold: true, size: 34 }, { spacing: { after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: HX.GOLD, space: 4 } } }))
  const h = (t) => kids.push(p(t, { bold: true, size: 22 }, { spacing: { before: 200, after: 60 } }))
  const para = (t) => kids.push(p(t, { size: 19 }, { spacing: { after: 80 } }))
  h("Event and price"); para("Use a short headline (Open House, Just Listed, Price Improved), the date and start/end time, the price and the key facts. Copy the price and facts from the MLS listing so the flyer and the listing match.")
  h("Photo"); para(design === "classic" ? "Use your strongest exterior photo across the top and three interior photos in the strip below it. Click each photo box and insert a picture." : "One strong exterior or living-room photo does more than several small ones. Click the photo box and insert a picture.")
  h("Highlights"); para("Three to five specific features that are true for this home. Describe the property, not the people who might live there.")
  h("QR code and contact details"); para("Generate a QR code for the listing link (or your sign-in page), place it in the white square, and test it with a phone before printing. Add your name, brokerage, phone, email, license number and any disclosures your brokerage or state requires.")
  h("Before you print")
  for (const item of ["Date, time, address, price and facts match the MLS listing", "Wording follows your brokerage's advertising and fair housing rules", "QR code scanned with a phone and opens the right page", "Printed one copy and read it start to finish"]) {
    kids.push(new Paragraph({ spacing: { after: 40 }, indent: { left: 360, hanging: 360 }, children: [run("☐\t", { size: 19 }), run(item, { size: 19 })] }))
  }
  kids.push(p("ListingFlare members can also build a flyer from a saved listing, using its own photos, facts and a QR code, in three layouts.", { size: 17, italics: true, color: "6E6E78" }, { spacing: { before: 200 } }))

  const doc = new Document({
    creator: "ListingFlare", title: `Open House Flyer (${design[0].toUpperCase()}${design.slice(1)})`, description: "Free template from ListingFlare",
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 700, right: 1000, bottom: 800, left: 1000 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
        run(FLYER_FOOTER + "   Page ", { size: 14, color: "969696" }),
        new TextRun({ children: [PageNumber.CURRENT], size: 14, color: "969696", font: "Calibri" }),
        run(" of ", { size: 14, color: "969696" }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: "969696", font: "Calibri" }),
      ] })] }) },
      children: kids,
    }],
  })
  return Packer.toBuffer(doc)
}
