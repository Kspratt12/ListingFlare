import { BlogPost } from "@/lib/blog";
import { downloadBox } from "@/content/templates";

export const article: BlogPost = {
  slug: "open-house-sign-in-sheet-template",
  title: "Open House Sign-In Sheet Template (Free Printable PDF)",
  description:
    "A free printable open house sign-in sheet as a PDF or Word file, plus what to put on it, how to word consent, and what to do with the names afterward.",
  date: "2026-10-25",
  author: "ListingFlare Team",
  category: "Open Houses",
  keywords: [
    "open house sign in sheet template",
    "open house sign in sheet",
    "open house sign in sheet printable",
    "open house sign in sheet pdf",
    "open house guest list template",
  ],
  readingTime: 5,
  coverImage:
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&h=630&fit=crop&q=80",
  coverImageAlt:
    "Modern home exterior with a swimming pool at dusk, the kind of home an open house promotes",
  content: `
<p>An open house sign-in sheet is a one-page form at the door where visitors write their name and contact details, so you can follow up after the event. The template below is a printable one-page sheet with a header for the property, a spot for your consent wording, and a table for name, phone, email, whether the visitor has an agent, and notes. Download it as a PDF or a Word file.</p>

<p><em>Disclosure: we make ListingFlare, which offers a QR code sign-in as an alternative, mentioned near the end. The sheet works on its own.</em></p>

${downloadBox("open-house-sign-in-sheet-template")}

<h2>What to Put on a Sign-In Sheet</h2>

<table>
<thead><tr><th>Column</th><th>Why it is there</th></tr></thead>
<tbody>
<tr><td>Name</td><td>So you can greet them by name in follow-up</td></tr>
<tr><td>Phone</td><td>Optional contact method, only if they agree to be contacted</td></tr>
<tr><td>Email</td><td>The easiest way to send the listing link and a thank-you</td></tr>
<tr><td>Has an agent? (Y/N)</td><td>Tells you how to approach follow-up, and helps you follow your brokerage's rules</td></tr>
<tr><td>Notes</td><td>What they liked or asked, to make the follow-up personal</td></tr>
</tbody>
</table>

<p>Ask only for what you will use. A short sheet is easier and quicker to fill in than a long one.</p>

<h2>Add Consent Wording</h2>
<p>Visitors should know what their details will be used for. The template has a spot at the top for a short consent line. An example you can adapt: <em>By signing in, I agree that the host may contact me about this property.</em> Rules on calls, texts and marketing emails vary, and your brokerage may have its own required wording, so check both before you print. This is general guidance, not legal advice. The <a href="https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business" target="_blank" rel="noopener noreferrer">FTC&rsquo;s CAN-SPAM compliance guide for business</a> is a good starting point for marketing emails.</p>

<h2>Tips for the Day</h2>
<ul>
<li><strong>Make signing in optional.</strong> Do not require contact details to enter. Pressure can lead to made-up entries.</li>
<li><strong>Keep the sheet covered or face-down.</strong> Visitors should not be able to read each other's details.</li>
<li><strong>Print extra sheets.</strong> A busy open house can fill one quickly.</li>
<li><strong>Use a pen on a string or clipboard,</strong> so it does not walk away.</li>
<li><strong>Add the property address and date first.</strong> You will thank yourself when you have several open houses in a week.</li>
</ul>

<h2>What to Do With the Sheet Afterward</h2>
<p>Type the names into your contact list the same day and send a quick thank-you. Our guide to <a href="/blog/open-house-follow-up">open house follow-up</a> has a timeline and templates for email and text. Keep the sheet somewhere private, since it has personal information.</p>

<h2>Paper Sheet or QR Code?</h2>
<p>Some agents use a paper sheet, some use a QR code that opens a sign-in form on a visitor's phone, and some use both. A paper sheet needs no phone, battery or connection, but you have to type it up afterward. A QR sign-in puts the details straight into your lead list. ListingFlare gives each listing a QR sign-in page that asks for name, email, phone and whether the visitor has an agent, then creates a lead and starts your follow-up emails. See <a href="/blog/open-house-sign-in-sheet-vs-qr-code">sign-in sheet vs QR code</a> for a fuller comparison, and the <a href="/blog/open-house-flyer-generator">open house flyer generator</a> if you want a flyer with the QR code on it.</p>

<div class="faq-section">
<h2>Frequently Asked Questions</h2>

<h3>What should an open house sign-in sheet include?</h3>
<p>The property address and date, a short consent line, and columns for name, phone, email, whether the visitor has an agent, and notes.</p>

<h3>Is there a free open house sign-in sheet template?</h3>
<p>Yes. This page offers a free printable PDF and an editable Word version of a one-page sheet.</p>

<h3>Do I need consent wording on a sign-in sheet?</h3>
<p>It is good practice to tell visitors how you will use their details, and rules on calls, texts and marketing emails vary. Check your brokerage's guidance and the rules where you work.</p>

<h3>Should visitors have to sign in?</h3>
<p>Making it optional is a good default. Requiring it can discourage people from visiting and often leads to made-up details.</p>

<h3>Is a QR code better than a paper sign-in sheet?</h3>
<p>Each has trade-offs. Paper needs no phone but you must type it up. A QR sign-in saves the details automatically but depends on visitors using their phones. Many agents offer both.</p>
</div>
`,
};
