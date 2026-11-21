// PDF builder shared by scripts/build-templates.mjs (the committed downloads) and the in-browser
// template customizer on the blog. Runs in Node and in the browser (no Node APIs).

import { jsPDF, AcroFormTextField, AcroFormCheckBox } from "jspdf"
import { resolveTheme, cleanText, brandingLine } from "./templateTheme.mjs"
import { FOOTER } from "./templateModels.mjs"

export * from "./templateModels.mjs"
export * from "./templateTheme.mjs"

// ───────────────────────── PDF ─────────────────────────

export function buildTemplatePdf(model, { fillable = false, theme = null, title = "", branding = null } = {}) {
  const th = resolveTheme(theme)
  const doc = new jsPDF({ unit: "mm", format: "letter" })
  let fieldCount = 0
  // Fillable version: a typeable text box laid over each blank line or cell, with a unique name.
  const addCheck = (x, fy, size, name) => {
    if (!fillable) return
    const c = new AcroFormCheckBox()
    c.fieldName = `check_${++fieldCount}_${name.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 20)}`
    c.Rect = [x, fy, size, size]
    c.appearanceState = "Off" // jsPDF creates boxes already ticked; start them empty
    c.value = "Off"
    doc.addField(c)
  }
  const addField = (x, fy, w, h, name) => {
    if (!fillable) return
    const f = new AcroFormTextField()
    f.fieldName = `${name}_${++fieldCount}`
    f.Rect = [x, fy, w, h]
    f.fontSize = 10
    doc.addField(f)
  }
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 16
  const CW = W - M * 2
  const FOOT = 14
  let y = M

  const ensure = (h) => { if (y + h > H - FOOT) { doc.addPage(); y = M } }
  const dark = () => doc.setTextColor(30, 30, 40)
  const heading = () => doc.setTextColor(...th.heading)
  const gray = () => doc.setTextColor(110, 110, 120)

  // Approximate height of a block, used to keep a heading with the content under it.
  const textHeight = (text, size) => { doc.setFontSize(size); return doc.splitTextToSize(text, CW - 1.5).length * 4 + 2.5 }
  const blockHeight = (b) => {
    if (b.t === "fields") return b.rows.length * 8.5 + 1
    if (b.t === "lines") return b.n * 7.5 + 1
    if (b.t === "table") return 7 + 16
    if (b.t === "checks" || b.t === "bullets") return b.items.length <= 8 ? b.items.length * 5.7 + 1 : 3 * 5.7 // same rule the block itself uses to stay on one page
    if (b.t === "para") return textHeight(b.text, 9)
    if (b.t === "note") return textHeight(b.text, 8.5)
    return 0
  }
  // Height a heading must keep with it: following notes/paragraphs plus the first real block, capped.
  const keepWithHeading = (idx) => {
    let h = 0
    for (let i = idx + 1; i < model.blocks.length; i++) {
      const nb = model.blocks[i]
      h += blockHeight(nb)
      if (nb.t !== "note" && nb.t !== "para") break
    }
    return Math.min(h, 75)
  }

  // title band (fill-only, so the light-grey table-header check is unaffected)
  doc.setFont("helvetica", "normal"); doc.setFontSize(9)
  const sub = doc.splitTextToSize(model.subtitle, CW)
  const brandLine = brandingLine(branding)
  const shownTitle = (cleanText(title, 60) || model.title).toUpperCase()
  const bandH = 22 + sub.length * 4.2 + (brandLine ? 6 : 0)
  doc.setFillColor(...th.band); doc.rect(0, 0, W, bandH, "F")
  if (th.accent) { doc.setFillColor(...th.accent); doc.rect(0, bandH, W, 1.4, "F") }
  doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(...th.label)
  doc.text("FREE TEMPLATE  ·  LISTINGFLARE", M, 9, { charSpace: 0.3 })
  doc.setFontSize(20); doc.setTextColor(...th.title)
  doc.text(doc.splitTextToSize(shownTitle, CW)[0], M, 18)
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...th.subtitle)
  doc.text(sub, M, 24.5)
  if (brandLine) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...th.title)
    doc.text(doc.splitTextToSize(brandLine, CW)[0], M, 24.5 + sub.length * 4.2 + 2.5)
  }
  y = bandH + 9

  for (const [bi, b] of model.blocks.entries()) {
    if (b.t === "h2") {
      ensure(12 + keepWithHeading(bi)); y += 3
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); heading(); doc.text(b.text, M, y)
      y += 2; doc.setDrawColor(210, 210, 220); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 5.5
    } else if (b.t === "para" || b.t === "note") {
      const italic = b.t === "note"
      doc.setFont("helvetica", italic ? "italic" : "normal"); doc.setFontSize(italic ? 8.5 : 9)
      italic ? gray() : dark()
      const lines = doc.splitTextToSize(b.text, CW - 1.5)
      ensure(lines.length * 4 + 2)
      doc.text(lines, M, y); y += lines.length * 4 + 2.5
    } else if (b.t === "fields") {
      const gap = 8
      ensure(b.rows.length * 8.5 + 1) // keep the whole block of fields on one page
      for (const row of b.rows) {
        ensure(9)
        const colW = row.length === 2 ? (CW - gap) / 2 : CW
        row.forEach((label, i) => {
          const x = M + i * (colW + gap)
          doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); gray()
          const lw = Math.min(doc.getTextWidth(label) + 2, colW * 0.62)
          const shown = doc.splitTextToSize(label, colW * 0.62)[0]
          doc.text(shown, x, y)
          doc.setDrawColor(150, 150, 160); doc.setLineWidth(0.25)
          doc.line(x + lw, y + 1, x + colW, y + 1)
          addField(x + lw + 0.5, y - 4.2, colW - lw - 0.5, 5.4, label.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 24))
        })
        y += 8.5
      }
      y += 1
    } else if (b.t === "lines") {
      for (let i = 0; i < b.n; i++) {
        ensure(8); doc.setDrawColor(150, 150, 160); doc.setLineWidth(0.25); doc.line(M, y + 1, W - M, y + 1); addField(M, y - 4.2, CW, 5.4, "notes"); y += 7.5
      }
      y += 1
    } else if (b.t === "bullets" || b.t === "checks") {
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); dark()
      if (b.items.length <= 8) ensure(b.items.length * 5.7 + 1) // keep a short checklist on one page
      for (const item of b.items) {
        const lines = doc.splitTextToSize(item, CW - 7)
        ensure(lines.length * 4.2 + 1.5)
        if (b.t === "checks") { doc.setDrawColor(90, 90, 100); doc.setLineWidth(0.3); doc.rect(M, y - 2.8, 3.2, 3.2); addCheck(M, y - 2.8, 3.2, item) }
        else doc.text("•", M + 0.5, y)
        doc.text(lines, M + 6, y); y += lines.length * 4.2 + 1.5
      }
      y += 1
    } else if (b.t === "table") {
      const total = b.cols.reduce((s, c) => s + c[1], 0)
      const widths = b.cols.map((c) => (c[1] / total) * CW)
      const header = () => {
        doc.setFillColor(238, 240, 246); doc.setDrawColor(190, 190, 200); doc.setLineWidth(0.25)
        let x = M
        b.cols.forEach((c, i) => {
          doc.setFillColor(238, 240, 246) // jsPDF shares one colour between text and fills, so reset it for every cell
          doc.rect(x, y, widths[i], 7, "FD")
          doc.setFont("helvetica", "bold"); doc.setFontSize(8); dark(); doc.text(c[0], x + 1.8, y + 4.7)
          x += widths[i]
        })
        y += 7
      }
      ensure(7 + 8 * 2); header()
      for (let r = 0; r < b.rows; r++) {
        if (y + 8 > H - FOOT) { doc.addPage(); y = M; header() }
        let x = M
        doc.setDrawColor(190, 190, 200); doc.setLineWidth(0.25)
        widths.forEach((w, ci) => { doc.rect(x, y, w, 8); addField(x + 0.4, y + 0.4, w - 0.8, 7.2, `r${r + 1}_${b.cols[ci][0].replace(/[^A-Za-z0-9]+/g, "_").slice(0, 16)}`); x += w })
        y += 8
      }
      y += 3
    } else if (b.t === "pagebreak") {
      doc.addPage(); y = M
    }
  }

  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(150, 150, 160)
    doc.text(FOOTER, M, H - 8)
    doc.text(`Page ${p} of ${pages}`, W - M, H - 8, { align: "right" })
  }
  doc.setProperties({ title: model.title, subject: "Free template from ListingFlare", creator: "ListingFlare" })
  return doc.output("arraybuffer")
}
