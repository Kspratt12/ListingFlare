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
import { jsPDF, AcroFormTextField, AcroFormCheckBox } from "jspdf"
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, AlignmentType, Footer, PageNumber, PageBreak,
} from "docx"

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "downloads")
fs.mkdirSync(OUT, { recursive: true })

const FOOTER = "Free template from ListingFlare (listingflare.com). General guidance, not legal advice."

// ───────────────────────── content ─────────────────────────
// Block types: h2, fields, para, note, bullets, checks, table, lines, pagebreak.
// fields rows are arrays of one or two labels.

const listingPresentation = {
  file: "real-estate-listing-presentation-template",
  title: "Listing Presentation",
  subtitle: "Fill this in before the meeting, then walk the seller through it. Replace the example wording with your own and follow your brokerage's requirements.",
  blocks: [
    { t: "h2", text: "1. About you" },
    { t: "fields", rows: [["Agent name", "Brokerage"], ["Phone", "Email"], ["License no. (if shown)", "Years in this area"]] },
    { t: "note", text: "Keep this short. Use only testimonials you have permission to share, and check your brokerage's rules on what you may claim." },
    { t: "h2", text: "2. The seller and the home" },
    { t: "fields", rows: [["Seller name(s)", "Meeting date"], ["Property address"], ["Target move date", "Reason for moving"]] },
    { t: "note", text: "What does the seller want, and what worries them? Write it in their words so you can show you listened." },
    { t: "lines", n: 3 },
    { t: "h2", text: "3. Market and comparable homes" },
    { t: "note", text: "Use recent, nearby sales and active listings from your MLS, and be ready to explain each adjustment. Do not guess at numbers you have not checked." },
    { t: "table", cols: [["Address", 30], ["Sold or active", 14], ["Price", 14], ["Date", 12], ["Size and beds/baths", 16], ["Adjustments", 14]], rows: 6 },
    { t: "h2", text: "4. Pricing recommendation" },
    { t: "fields", rows: [["Recommended list price or range"], ["Why this price (in one or two sentences)"]] },
    { t: "note", text: "Explain your reasoning with the comparables above. Avoid telling the seller what they want to hear if the data does not support it." },
    { t: "h2", text: "5. Marketing plan" },
    { t: "note", text: "Tick only what you will actually do for this listing, and add a date or owner where it helps. These are common items, not a promise of results." },
    { t: "checks", items: [
      "Professional photos",
      "Written listing description",
      "MLS entry and syndication",
      "A web page for this one listing with a link or QR code",
      "Open house or broker open",
      "Social media posts",
      "Email or text to my contacts",
      "Yard sign and printed flyers",
    ] },
    { t: "fields", rows: [["Other marketing"], ["Photo and showing prep date"]] },
    { t: "h2", text: "6. How we will communicate" },
    { t: "fields", rows: [["Update schedule (for example weekly)"], ["Preferred method (call, text, email)"], ["How showing feedback is shared"]] },
    { t: "h2", text: "7. Fees and agreement" },
    { t: "note", text: "Describe fees and the agreement in plain language, in line with your brokerage's policies and local law. Do not give legal or tax advice." },
    { t: "fields", rows: [["Fee or commission as agreed"], ["Agreement length and conditions"]] },
    { t: "h2", text: "8. Next steps" },
    { t: "fields", rows: [["Next step"], ["Follow-up date", "Who does what"]] },
    { t: "note", text: "This template is a starting point, not legal advice. Follow your brokerage's required forms and disclosures and the rules where you work." },
  ],
}

const openHouseSignIn = {
  file: "open-house-sign-in-sheet-template",
  title: "Open House Sign-In Sheet",
  subtitle: "Print it and keep it at the door. Add your own consent wording first, so visitors know how their details will be used.",
  blocks: [
    { t: "fields", rows: [["Property address"], ["Open house date", "Hosted by"]] },
    { t: "note", text: "Consent wording to edit and place here (example): By signing in, I agree that the host may contact me about this property. Check your brokerage's rules, and the rules where you work on calls and text messages, before you use or change this wording." },
    { t: "lines", n: 2 },
    { t: "table", cols: [["Name", 24], ["Phone", 17], ["Email", 27], ["Has agent? Y/N", 15], ["Notes", 17]], rows: 18 },
    { t: "note", text: "Visitors choose what to share. Do not require contact details to enter, and keep the sheet face-down or covered so visitors cannot read each other's details." },
  ],
}

const sellerUpdate = {
  file: "seller-update-report-template",
  title: "Seller Update Report",
  subtitle: "A short weekly update for a listing's seller. Fill in real numbers from your own records, and keep buyer details private.",
  blocks: [
    { t: "h2", text: "Listing" },
    { t: "fields", rows: [["Property address"], ["Seller name(s)", "Report date"], ["Reporting period"]] },
    { t: "h2", text: "Activity this period" },
    { t: "note", text: "Use counts from your own records, such as your listing page, MLS and showing schedule. Leave a cell blank if you do not have the figure." },
    { t: "table", cols: [["Measure", 32], ["This period", 17], ["Last period", 17], ["Notes", 34]], rows: 7 },
    { t: "note", text: "Suggested rows: listing page visits, online inquiries, showings, open house visitors, offers or written feedback." },
    { t: "h2", text: "Showing feedback" },
    { t: "note", text: "Summarize themes in neutral words, without buyer names or contact details. Example: Two visitors liked the kitchen and one mentioned the age of the roof." },
    { t: "lines", n: 4 },
    { t: "h2", text: "What I did this period" },
    { t: "checks", items: [
      "Shared the listing on social media",
      "Sent the listing to my contacts",
      "Held or scheduled an open house",
      "Updated photos or the description",
      "Followed up with buyers who inquired",
    ] },
    { t: "fields", rows: [["Other"]] },
    { t: "h2", text: "Market activity nearby" },
    { t: "note", text: "New listings, price changes and recent sales that affect this home. Stick to facts you have checked." },
    { t: "lines", n: 3 },
    { t: "h2", text: "Recommendation and next steps" },
    { t: "note", text: "Say what you suggest and why, for example keeping the price, changing it, or adding marketing. Tie it to the activity above." },
    { t: "lines", n: 3 },
    { t: "fields", rows: [["Seller questions to answer"], ["Next update date"], ["Agent name", "Phone"]] },
    { t: "note", text: "General guidance, not legal advice. Follow your brokerage's rules on what you may share with sellers." },
  ],
}

const propertyWebsite = {
  file: "single-property-website-template",
  title: "Single Property Website: Content Template",
  subtitle: "Fill in every section before you build the page. Use facts you have checked, and keep the wording about the home, not about the people who might buy it.",
  blocks: [
    { t: "h2", text: "1. Property basics" },
    { t: "fields", rows: [["Street address"], ["City", "State and ZIP"], ["List price", "Property type"], ["Beds", "Baths"], ["Square feet", "Year built"], ["Lot size", "HOA fee (if any)"]] },
    { t: "h2", text: "2. Headline and first impression" },
    { t: "note", text: "One short headline that says what makes this home worth a visit. Avoid vague superlatives you cannot back up." },
    { t: "lines", n: 2 },
    { t: "fields", rows: [["Hero photo (which shot and why)"]] },
    { t: "h2", text: "3. Description" },
    { t: "note", text: "Three short paragraphs: the home, its best features, and the location. Use facts, not adjectives, and include only what you can verify." },
    { t: "lines", n: 6 },
    { t: "h2", text: "4. Key features" },
    { t: "table", cols: [["Feature", 36], ["Detail", 64]], rows: 8 },
    { t: "h2", text: "5. Neighborhood" },
    { t: "note", text: "Mention only what you have checked, and send buyers to official sources for schools and taxes." },
    { t: "fields", rows: [["Schools (check the district site)"], ["Commute or transit"], ["Nearby shops and parks"], ["What buyers often ask about the area"]] },
    { t: "h2", text: "6. Photos, video and tours" },
    { t: "checks", items: [
      "Exterior, front",
      "Main living areas",
      "Kitchen",
      "Primary bedroom and bath",
      "Outdoor space",
      "Floor plan or layout",
      "Video walkthrough (optional)",
      "Virtual tour link (optional)",
    ] },
    { t: "h2", text: "7. Questions buyers ask" },
    { t: "note", text: "Write the answers once. They work as an on-page FAQ and as source material for any chat assistant. Common topics: HOA fees, property taxes, age of the roof and HVAC, utilities, school district, parking, pets, and offer deadlines." },
    { t: "table", cols: [["Question", 40], ["Answer", 60]], rows: 8 },
    { t: "h2", text: "8. Call to action and lead form" },
    { t: "fields", rows: [["Main button text (for example Schedule a showing)"], ["Form fields you will ask for"], ["Who is notified, and how fast you will reply"]] },
    { t: "h2", text: "9. Agent details" },
    { t: "fields", rows: [["Agent name", "Brokerage"], ["Phone", "Email"], ["License no. (if required)"]] },
    { t: "note", text: "Fair housing: describe the home, not the people. Avoid wording that suggests a preference or limitation based on a protected class, and follow your brokerage's and MLS rules on advertising." },
  ],
}

const openHouseChecklist = {
  file: "open-house-checklist-template",
  title: "Open House Checklist",
  subtitle: "Tick things off before, during and after the open house. Add anything your brokerage requires, including its safety guidance.",
  blocks: [
    { t: "fields", rows: [["Property address"], ["Date and time", "Hosted by"]] },
    { t: "h2", text: "A week before" },
    { t: "checks", items: [
      "Confirm the date and time with the seller",
      "Schedule cleaning and any staging",
      "Check that the open house shows on the MLS and your listing page",
      "Print flyers with a link or QR code",
      "Post on social media and email your contacts",
      "Tell nearby neighbors if you wish",
      "Plan signs and parking",
      "Read your brokerage's open house and safety guidance",
    ] },
    { t: "h2", text: "The day before" },
    { t: "checks", items: [
      "Walk through with the seller: put away valuables, medication and personal papers",
      "Print sign-in sheets and test the QR sign-in link on your phone",
      "Prepare a one-page feature sheet",
      "Check the weather and have a backup plan",
      "Charge your phone, and tell someone your schedule",
    ] },
    { t: "h2", text: "At the open house" },
    { t: "checks", items: [
      "Arrive early, turn on lights and open the blinds",
      "Put out signs",
      "Set up the sign-in at the door",
      "Greet every visitor and note what they say",
      "Know where the exits are, and follow your safety guidance",
      "Walk every room at the end before you leave",
    ] },
    { t: "h2", text: "After" },
    { t: "checks", items: [
      "Lock up and turn off lights",
      "Send a thank-you the same day or next morning",
      "Enter new contacts in your CRM",
      "Share feedback with the seller",
      "Schedule follow-ups for about day 3 and day 7",
    ] },
    { t: "note", text: "General guidance, not legal advice. Follow your brokerage's rules and local requirements for open houses, advertising and safety." },
  ],
}

const marketingPlan = {
  file: "listing-marketing-plan-template",
  title: "Listing Marketing Plan",
  subtitle: "A one-to-two page plan to give a seller once they hire you. List only what you will actually do, and do not promise results.",
  blocks: [
    { t: "h2", text: "Listing and seller" },
    { t: "fields", rows: [["Property address"], ["Seller name(s)", "Agent"], ["Plan date"]] },
    { t: "h2", text: "Goals" },
    { t: "fields", rows: [["Seller's main goal"], ["Target timeline"]] },
    { t: "h2", text: "Pricing and timeline" },
    { t: "fields", rows: [["Planned list price", "List date"], ["Price review date", "Open house date(s)"]] },
    { t: "h2", text: "Marketing activities" },
    { t: "note", text: "Examples: professional photos, a web page for this one listing, social posts, email to your contacts, an open house. Add a date and who is responsible." },
    { t: "table", cols: [["Activity", 28], ["What I will do", 40], ["When", 16], ["Done", 16]], rows: 10 },
    { t: "h2", text: "Online" },
    { t: "checks", items: [
      "Listed on the MLS",
      "A web page for this listing, with a link or QR code",
      "Social media posts",
      "Email or text to my contacts",
      "Paid promotion (only if agreed with the seller)",
    ] },
    { t: "fields", rows: [["Link to the listing page"]] },
    { t: "h2", text: "In person" },
    { t: "checks", items: ["Yard sign", "Open house", "Broker preview", "Printed flyers"] },
    { t: "h2", text: "Communication" },
    { t: "fields", rows: [["Update schedule (for example weekly)"], ["Preferred method (call, text, email)"]] },
    { t: "h2", text: "How we will measure progress" },
    { t: "fields", rows: [["Numbers I will report (for example visits, inquiries, showings)"], ["Review dates"]] },
    { t: "h2", text: "Acknowledgement" },
    { t: "fields", rows: [["Seller signature", "Date"], ["Agent signature", "Date"]] },
    { t: "note", text: "This plan describes activities, not guaranteed results. It is not a contract. Follow your brokerage's required forms and the rules where you work." },
  ],
}

const preListing = {
  file: "pre-listing-checklist-template",
  title: "Pre-Listing Checklist",
  subtitle: "Work through this before the listing goes live. Add the forms and steps your brokerage and your state require.",
  blocks: [
    { t: "fields", rows: [["Property address"], ["Seller name(s)", "Target go-live date"]] },
    { t: "h2", text: "Paperwork" },
    { t: "checks", items: [
      "Listing agreement signed",
      "Seller disclosures completed, as required where you work",
      "HOA documents requested, if any",
      "Ownership and title details confirmed",
      "Property tax information gathered",
      "Showing instructions and lockbox plan agreed",
      "Occupancy and access details noted",
    ] },
    { t: "h2", text: "Pricing" },
    { t: "checks", items: ["Comparable sales reviewed", "Pricing strategy agreed with the seller", "Price review date set"] },
    { t: "h2", text: "Home preparation" },
    { t: "checks", items: [
      "Declutter and deep clean",
      "Repairs list agreed",
      "Staging plan",
      "Curb appeal and landscaping",
      "Utilities on for photos and showings",
      "Plan for pets during showings",
    ] },
    { t: "h2", text: "Photos and media" },
    { t: "checks", items: ["Photographer booked", "Video or 3D tour, if used", "Floor plan, if used", "Photos reviewed and chosen"] },
    { t: "h2", text: "Marketing setup" },
    { t: "checks", items: [
      "Listing description written and fact-checked",
      "Listing page ready, with the lead form tested",
      "QR code and flyer ready",
      "Social posts scheduled",
      "Open house scheduled",
      "Email to my contacts ready",
    ] },
    { t: "h2", text: "Go live" },
    { t: "fields", rows: [["Go-live date", "MLS number"], ["First seller update date"]] },
    { t: "note", text: "General guidance, not legal advice. Required forms, disclosures and steps vary by brokerage and location." },
  ],
}

// ───────────────────────── PDF ─────────────────────────

function buildPdf(model, { fillable = false } = {}) {
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

  // title
  doc.setFont("helvetica", "bold"); doc.setFontSize(20); dark()
  doc.text(model.title.toUpperCase(), M, y + 6); y += 10
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); gray()
  const sub = doc.splitTextToSize(model.subtitle, CW)
  doc.text(sub, M, y); y += sub.length * 4.2 + 1
  doc.setDrawColor(154, 136, 102); doc.setLineWidth(0.8); doc.line(M, y, W - M, y); y += 6

  for (const [bi, b] of model.blocks.entries()) {
    if (b.t === "h2") {
      ensure(12 + keepWithHeading(bi)); y += 3
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); dark(); doc.text(b.text, M, y)
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
  doc.setProperties({ title: model.title, subject: "Free template from Supplement Snap", creator: "Supplement Snap" })
  return Buffer.from(doc.output("arraybuffer"))
}

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
    creator: "Supplement Snap",
    title: model.title,
    description: "Free template from Supplement Snap",
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

// ───────────────────────── write ─────────────────────────

const write = (name, buf) => { fs.writeFileSync(path.join(OUT, name), buf); console.log(name.padEnd(54), (buf.length / 1024).toFixed(1) + " KB") }

for (const model of [listingPresentation, sellerUpdate, propertyWebsite, marketingPlan]) {
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
