// Open house flyer designs (Classic, Modern, Minimal) for the free template downloads.
// Used by scripts/build-templates.mjs (blank printable, fillable and Word files) and by the preview
// renderer (sample mode: fictional text and illustrations, never part of the downloads).
//
// Every design: page 1 is the flyer, page 2 is the same fill-in guidance and before-you-print list.
// Fillable fields on dark backgrounds sit on white input boxes, because jsPDF writes no per-field text
// colour (typed text is always black).
import { jsPDF, AcroFormTextField, AcroFormCheckBox } from "jspdf"
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, AlignmentType, Footer, PageNumber, PageBreak,
} from "docx"

export const FLYER_DESIGNS = ["classic", "modern", "minimal"]
export const FLYER_FOOTER = "Free template from ListingFlare (listingflare.com). General guidance, not legal advice."

// Fictional sample content for previews only.
export const SAMPLE = {
  headline: "OPEN HOUSE",
  date: "Saturday, May 16",
  time: "1 - 4 PM",
  price: "$489,000",
  address: "214 Maple Grove Lane",
  city: "Brookside, NC 28700",
  facts: { Beds: "4", Baths: "2.5", "Square feet": "2,350", "Year built": "2016" },
  highlights: ["Renovated kitchen with quartz counters", "Primary suite with a walk-in closet", "Fenced backyard with a covered patio", "Two-car garage and mudroom"],
  about: "Bright two-story home on a quiet street, with an open kitchen and family room, a main-floor office and a large fenced yard.",
  message: "Refreshments served. Park on Maple Grove Lane.",
  agent: "Jordan Avery", brokerage: "Example Realty Group", phone: "(555) 010-2468", email: "jordan@example.com",
  qrLink: "listingflare.com/listing/sample",
}

const NAVY = [15, 23, 42], GOLD = [184, 150, 90], INK = [30, 30, 40], MUTED = [110, 110, 120], LINE = [205, 205, 212], SOFTGOLD = [190, 175, 140]

// mode: "print" (blank lines), "fill" (form fields), "sample" (fictional text + images)
export function buildFlyerPdf(design, { fillable = false, sample = null } = {}) {
  const mode = sample ? "sample" : fillable ? "fill" : "print"
  const doc = new jsPDF({ unit: "mm", format: "letter" })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  let n = 0

  const label = (text, x, y, color = MUTED, size = 7, align) => { doc.setFont("helvetica", "bold"); doc.setFontSize(size); doc.setTextColor(...color); doc.text(text.toUpperCase(), x, y, { charSpace: 0.3, ...(align ? { align } : {}) }) }
  const rule = (x, y, w, light = false) => { if (mode === "sample") return; doc.setDrawColor(...(light ? [120, 130, 150] : LINE)); doc.setLineWidth(0.3); doc.line(x, y, x + w, y) }
  // A text slot: a form field (fill), fictional text (sample) or nothing (print; caller draws the line).
  const slot = (x, y, w, h, name, value, o = {}) => {
    const { size = 10, align = "left", onDark = false, color = onDark ? [255, 255, 255] : INK, bold = false, font = "helvetica" } = o
    if (mode === "fill") {
      if (onDark) { doc.setFillColor(255, 255, 255); doc.roundedRect(x - 0.6, y - 0.3, w + 1.2, h + 0.6, 0.8, 0.8, "F") }
      const f = new AcroFormTextField()
      f.fieldName = `${name}_${++n}`
      f.Rect = [x, y, w, h]
      f.fontSize = size
      f.textAlign = align
      doc.addField(f)
    } else if (mode === "sample" && value) {
      doc.setFont(font, bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(...color)
      const tx = align === "center" ? x + w / 2 : align === "right" ? x + w : x
      doc.text(doc.splitTextToSize(String(value), w)[0], tx, y + h * 0.72, { align })
    }
  }
  const photo = (x, y, w, h, key, hint = true) => {
    if (mode === "sample" && sample?.images?.[key]) { doc.addImage(sample.images[key], "JPEG", x, y, w, h); return }
    doc.setFillColor(241, 243, 247); doc.setDrawColor(...LINE); doc.setLineWidth(0.4); doc.rect(x, y, w, h, "FD")
    if (!hint) return
    const cx = x + w / 2, cy = y + h / 2 - (h > 40 ? 6 : 2)
    const s = h > 40 ? 1 : 0.55
    doc.setDrawColor(170, 175, 190); doc.setLineWidth(0.6)
    doc.roundedRect(cx - 12 * s, cy - 8 * s, 24 * s, 16 * s, 2 * s, 2 * s); doc.circle(cx, cy, 4.5 * s); doc.rect(cx - 5 * s, cy - 10.5 * s, 10 * s, 2.5 * s)
    if (h > 40) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED)
      doc.text("Your best exterior or living-room photo", cx, cy + 16, { align: "center" })
      doc.setFontSize(7.5); doc.text("In Word, insert a picture here. In a PDF editor, add an image over this box.", cx, cy + 21, { align: "center" })
    }
  }
  const qr = (x, y, size, dark) => {
    if (mode === "sample" && sample?.qr) { doc.setFillColor(255, 255, 255); doc.rect(x, y, size, size, "F"); doc.addImage(sample.qr, "PNG", x + 1, y + 1, size - 2, size - 2) }
    else {
      doc.setFillColor(255, 255, 255); doc.setDrawColor(...(dark ? [255, 255, 255] : LINE)); doc.setLineWidth(0.4); doc.rect(x, y, size, size, dark ? "F" : "FD")
      doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...MUTED)
      doc.text("Your QR code", x + size / 2, y + size / 2 - 1, { align: "center" }); doc.text("(scan to test)", x + size / 2, y + size / 2 + 2.5, { align: "center" })
    }
    doc.setFont("helvetica", "bold"); doc.setFontSize(5.5); doc.setTextColor(...(dark ? SOFTGOLD : GOLD))
    doc.text("SCAN FOR PHOTOS & DETAILS", x + size / 2, y + size + 3.5, { align: "center" })
  }
  const S = sample?.text || SAMPLE

  // Contact bar used by Classic and Modern (dark) and Minimal (light).
  const contactBar = (by, dark) => {
    const M = dark ? 12 : 16
    if (dark) { doc.setFillColor(...NAVY); doc.rect(0, by, W, H - by, "F"); doc.setFillColor(...GOLD); doc.rect(0, by, W, 1.2, "F") }
    else { doc.setDrawColor(...GOLD); doc.setLineWidth(0.6); doc.line(M, by, W - M, by) }
    const qsize = 28, qx = W - M - qsize
    qr(qx, by + 5, qsize, dark)
    const lc = dark ? SOFTGOLD : GOLD
    const aw = qx - M - 8
    const row = (lab, yy, w, name, value, x = M) => { label(lab, x, yy, lc, 6.5); rule(x + 20, yy + 0.5, w - 20, dark); slot(x + 20, yy - 4.2, w - 20, 5.2, name, value, { size: 9.5, onDark: dark }) }
    row("Agent", by + 10, aw / 2 - 3, "agent_name", S.agent); row("Brokerage", by + 10, aw / 2 - 3, "brokerage", S.brokerage, M + aw / 2 + 3)
    row("Phone", by + 18, aw / 2 - 3, "phone", S.phone); row("Email", by + 18, aw / 2 - 3, "email", S.email, M + aw / 2 + 3)
    row("QR link", by + 26, aw, "qr_link", S.qrLink)
    doc.setFont("helvetica", "normal"); doc.setFontSize(6); doc.setTextColor(...(dark ? [150, 160, 180] : MUTED))
    doc.text("License # / brokerage disclosures: ______________________", M, by + 34)
  }
  const factCells = (x, y, w, style) => {
    const facts = ["Beds", "Baths", "Square feet", "Year built"]
    const gap = style === "tiles" ? 4 : 0
    const tw = (w - gap * 3) / 4
    facts.forEach((f, i) => {
      const fx = x + i * (tw + gap)
      if (style === "tiles") { doc.setFillColor(248, 246, 241); doc.setDrawColor(225, 215, 195); doc.setLineWidth(0.3); doc.roundedRect(fx, y, tw, 15, 1.5, 1.5, "FD") }
      else if (i > 0) { doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.line(fx, y + 1, fx, y + 13) }
      slot(fx + 2, y + 1.5, tw - 4, 8, `fact_${f}`, S.facts[f], { size: 14, align: "center", bold: mode === "sample" })
      label(f, fx + tw / 2, y + 12.5, GOLD, 7, "center")
    })
  }
  const lines = (x, y, w, count, name, values, step = 7, bullet = true) => {
    for (let i = 0; i < count; i++) {
      if (bullet) { doc.setFillColor(...GOLD); doc.circle(x + 1.3, y - 1.2, 0.9, "F") }
      const off = bullet ? 5 : 0
      rule(x + off, y + 0.8, w - off); slot(x + off, y - 4, w - off, 5.4, `${name}_${i + 1}`, values?.[i], { size: 10 })
      y += step
    }
    return y
  }

  // ---------------- page 1 ----------------
  if (design === "modern") {
    const M = 12, CW = W - M * 2
    doc.setFillColor(...NAVY); doc.rect(0, 0, W, 46, "F")
    doc.setFillColor(...GOLD); doc.rect(0, 46, W, 1.6, "F")
    label("Open house flyer · Event and price", M, 9, SOFTGOLD, 6.5)
    if (mode === "print") { doc.setFont("helvetica", "bold"); doc.setFontSize(30); doc.setTextColor(255, 255, 255); doc.text("OPEN HOUSE", M, 25) }
    slot(M, 14, CW * 0.7, 14, "headline", S.headline, { size: 26, onDark: true, bold: true })
    if (mode === "fill") label("Headline: Open House, Just Listed, Price Improved...", M, 31, [150, 160, 180], 6)
    label("Date", M, 38.5, SOFTGOLD); rule(M + 9, 39, 58, true); slot(M + 9, 34.5, 58, 5.5, "date", S.date, { onDark: true })
    label("Time", M + 74, 38.5, SOFTGOLD); rule(M + 83, 39, 40, true); slot(M + 83, 34.5, 40, 5.5, "time", S.time, { onDark: true })
    photo(M, 52, CW, 98, "hero")
    let y = 52 + 98 + 11
    label("Price", M, y - 5); rule(M, y + 2, 70); slot(M, y - 5, 70, 8, "price", S.price, { size: 18, bold: mode === "sample" })
    label("Property address", M + 78, y - 5); rule(M + 78, y + 2, CW - 78); slot(M + 78, y - 5, CW - 78, 8, "address", mode === "sample" ? `${S.address}, ${S.city}` : null, { size: 12 })
    y += 9
    factCells(M, y, CW, "tiles")
    y += 22
    doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...INK); doc.text("Highlights", M, y)
    lines(M, y + 6, CW, 4, "highlight", S.highlights)
    contactBar(H - 40, true)
  } else if (design === "classic") {
    const M = 12, CW = W - M * 2
    photo(0, 0, W, 112, "hero")
    // headline tab
    doc.setFillColor(...GOLD); doc.rect(0, 12, 92, 12, "F")
    if (mode === "print") { doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(255, 255, 255); doc.text("OPEN HOUSE", M, 20.3, { charSpace: 1.2 }) }
    slot(M, 13.6, 76, 8.8, "headline", S.headline, { size: 15, onDark: true, bold: true })
    // event + price band over the bottom of the photo
    doc.setFillColor(...NAVY); doc.rect(0, 84, W, 28, "F")
    label("Open house flyer · Event and price", M, 89.5, SOFTGOLD, 6)
    label("Date", M, 96.5, SOFTGOLD); rule(M + 9, 97, 50, true); slot(M + 9, 92.5, 50, 5.5, "date", S.date, { onDark: true })
    label("Time", M + 64, 96.5, SOFTGOLD); rule(M + 73, 97, 30, true); slot(M + 73, 92.5, 30, 5.5, "time", S.time, { onDark: true })
    label("Price", W - M - 62, 96.5, SOFTGOLD); rule(W - M - 50, 97, 50, true); slot(W - M - 50, 91.5, 50, 6.8, "price", S.price, { size: 15, onDark: true, bold: mode === "sample" })
    label("Address", M, 106.5, SOFTGOLD); rule(M + 16, 107, CW - 16, true); slot(M + 16, 102.5, CW - 16, 5.5, "address", mode === "sample" ? `${S.address}, ${S.city}` : null, { onDark: true })
    // photo strip
    const gw = (W - 2 * 1.2) / 3
    ;["g1", "g2", "g3"].forEach((k, i) => photo(i * (gw + 1.2), 113.2, gw, 40, k, false))
    // facts
    factCells(M, 158, CW, "line")
    doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.line(M, 176, W - M, 176)
    // about + highlights
    const colW = (CW - 10) / 2
    doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...INK)
    doc.text("About this home", M, 184); doc.text("Highlights", M + colW + 10, 184)
    if (mode === "sample") { doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...INK); doc.text(doc.splitTextToSize(S.about, colW), M, 191) }
    else lines(M, 191, colW, 5, "about", null, 7, false)
    lines(M + colW + 10, 191, colW, 4, "highlight", S.highlights, 8)
    contactBar(H - 40, true)
  } else {
    // minimal
    const M = 16, CW = W - M * 2
    photo(M, M, CW, 106, "hero")
    let y = M + 106 + 12
    label("Open house flyer · Event and price", W / 2, y, GOLD, 6.5, "center")
    y += 4
    if (mode === "print") { doc.setFont("times", "bold"); doc.setFontSize(26); doc.setTextColor(...INK); doc.text("Open House", W / 2, y + 9, { align: "center" }) }
    slot(W / 2 - 60, y, 120, 12, "headline", mode === "sample" ? "Open House" : null, { size: 24, align: "center", font: "times", bold: true })
    y += 18
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.5); doc.line(W / 2 - 12, y - 3, W / 2 + 12, y - 3)
    label("Date", W / 2 - 62, y + 4, MUTED, 6.5); rule(W / 2 - 52, y + 4.5, 50); slot(W / 2 - 52, y, 50, 5.5, "date", S.date, { align: "center" })
    label("Time", W / 2 + 6, y + 4, MUTED, 6.5); rule(W / 2 + 15, y + 4.5, 40); slot(W / 2 + 15, y, 40, 5.5, "time", S.time, { align: "center" })
    y += 13
    rule(M + 20, y + 7, CW - 40); slot(M + 20, y, CW - 40, 8, "address", S.address, { size: 17, align: "center", font: "times", bold: mode === "sample" })
    y += 12
    label("City · Price", M + 20, y + 4, MUTED, 6); rule(M + 40, y + 4.5, CW - 60); slot(M + 40, y, CW - 60, 5.5, "city_price", mode === "sample" ? `${S.city}  ·  ${S.price}` : null, { align: "center" })
    y += 11
    factCells(M + 15, y, CW - 30, "line")
    y += 21
    label("Short message (optional)", W / 2, y, MUTED, 6, "center")
    rule(M + 20, y + 7, CW - 40); slot(M + 20, y + 2, CW - 40, 5.5, "message", S.message, { align: "center", color: MUTED })
    contactBar(H - 42, false)
  }

  // ---------------- page 2: guidance (all designs) ----------------
  doc.addPage()
  const M2 = 12, CW2 = W - M2 * 2
  let y = 18
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...INK); doc.text("OPEN HOUSE FLYER: HOW TO FILL IT IN", M2, y)
  y += 3; doc.setDrawColor(...GOLD); doc.setLineWidth(0.8); doc.line(M2, y, W - M2, y); y += 9
  const para = (t, size = 9.5, color = INK, style = "normal") => { doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(...color); const l = doc.splitTextToSize(t, CW2); doc.text(l, M2, y); y += l.length * 4.6 + 2 }
  const h = (t) => { y += 2; doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...INK); doc.text(t, M2, y); y += 6 }
  h("Event and price")
  para("Use a short headline (Open House, Just Listed, Price Improved), the date and start/end time, the price and the key facts. Copy the price and facts from the MLS listing so the flyer and the listing match.")
  h("Photo")
  para(design === "classic"
    ? "Use your strongest exterior photo across the top and three interior photos in the strip below it. In the Word version, click each photo box and insert a picture."
    : "One strong exterior or living-room photo does more than several small ones. In the Word version, click the photo box and insert a picture.")
  h("Highlights")
  para("Three to five specific features that are true for this home. Describe the property, not the people who might live there.")
  h("QR code and contact details")
  para("Generate a QR code for the listing link (or your sign-in page), place it in the white square, and test it with a phone before printing. Add your name, brokerage, phone, email, license number and any disclosures your brokerage or state requires.")
  h("Before you print")
  for (const item of [
    "Date, time, address, price and facts match the MLS listing",
    "Wording follows your brokerage's advertising and fair housing rules",
    "QR code scanned with a phone and opens the right page",
    "Printed one copy and read it start to finish",
  ]) {
    doc.setDrawColor(90, 90, 100); doc.setLineWidth(0.3); doc.rect(M2, y - 3, 3.4, 3.4)
    if (mode === "fill") { const c = new AcroFormCheckBox(); c.fieldName = `check_${++n}`; c.Rect = [M2, y - 3, 3.4, 3.4]; c.appearanceState = "Off"; c.value = "Off"; doc.addField(c) }
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...INK); doc.text(item, M2 + 6, y); y += 6.5
  }
  y += 4
  para("ListingFlare members can also build a flyer from a saved listing, using its own photos, facts and a QR code, in three layouts.", 8.5, MUTED, "italic")

  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont("helvetica", "normal"); doc.setFontSize(6); doc.setTextColor(150, 160, 180)
    const fx = p === 1 ? (design === "minimal" ? 16 : 12) : M2
    const fy = p === 1 ? H - 2.5 : H - 8
    doc.text(FLYER_FOOTER, fx, fy)
    if (p === 1) doc.text(`Page 1 of ${pages}`, fx + doc.getTextWidth(FLYER_FOOTER) + 4, fy)
    else doc.text(`Page ${p} of ${pages}`, W - M2, fy, { align: "right" })
  }
  const title = `Open House Flyer (${design[0].toUpperCase()}${design.slice(1)})`
  doc.setProperties({ title, subject: "Free template from ListingFlare", creator: "ListingFlare" })
  return Buffer.from(doc.output("arraybuffer"))
}

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
