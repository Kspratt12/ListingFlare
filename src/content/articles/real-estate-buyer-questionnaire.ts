import { BlogPost } from "@/lib/blog";
import { downloadBox } from "@/content/templates";

export const article: BlogPost = {
  slug: "real-estate-buyer-questionnaire",
  title: "Real Estate Buyer Questionnaire (Free Template for Agents)",
  description:
    "A free real estate buyer questionnaire for agents as a printable PDF, fillable PDF and Word file, plus what to ask a new buyer and what to leave out.",
  date: "2026-11-14",
  author: "ListingFlare Team",
  category: "Agent Growth",
  keywords: [
    "real estate buyer questionnaire",
    "buyer questionnaire template",
    "buyer intake form real estate",
    "buyer consultation questions",
    "questions to ask a home buyer",
  ],
  readingTime: 6,
  coverImage: "/blog/best-open-house-apps/hero.jpg",
  coverImageAlt: "Agent with a tablet showing a couple around a bright open-plan home",
  content: `
<p>A real estate buyer questionnaire is a short form an agent uses with a new buyer to learn their timeline, budget, the kind of home they want and how they like to work. It turns a first conversation into a clear starting brief, so you can search with real criteria instead of guesses. The template below covers contact details, timeline, budget and financing, the home itself, working with an agent, showings, and a fair housing reminder. Download it as a printable PDF, a fillable PDF you type into on screen, or a Word file you can edit.</p>

<p><em>Disclosure: we make ListingFlare, which includes a lead inbox, mentioned near the end. The questionnaire works with any tools.</em></p>

${downloadBox("real-estate-buyer-questionnaire-template")}

<h2>What the Questionnaire Covers</h2>

<table>
<thead><tr><th>Section</th><th>What you learn</th></tr></thead>
<tbody>
<tr><td>Buyer details</td><td>How to reach them, and how they found you</td></tr>
<tr><td>Timeline and situation</td><td>When they want to move, and whether a lease or a sale affects the date</td></tr>
<tr><td>Budget and financing</td><td>The price range they are comfortable with and whether they have talked to a lender</td></tr>
<tr><td>The home you want</td><td>Areas, property type, size, must-haves, nice-to-haves and deal-breakers</td></tr>
<tr><td>Getting around</td><td>Places they travel to often and things nearby that matter to them</td></tr>
<tr><td>Working with an agent</td><td>Whether they already have an agent or an agreement in place</td></tr>
<tr><td>Showings</td><td>When they are free to see homes</td></tr>
</tbody>
</table>

<h2>When to Use It</h2>

<ul>
<li><strong>Before the first call.</strong> Send it to a new inquiry so the conversation starts with answers.</li>
<li><strong>At the first meeting.</strong> Use it as a guide and fill it in together, which keeps the conversation focused.</li>
<li><strong>When criteria change.</strong> Fill in a fresh copy if the buyer's budget, timeline or must-haves shift.</li>
</ul>

<h2>How to Use the Answers</h2>

<h3>Turn Must-Haves Into a Search</h3>
<p>Copy the areas, price range, bedrooms and must-haves into your MLS search. Keep the nice-to-haves as a tie-breaker when two homes both fit.</p>

<h3>Match Your Follow-Up to the Timeline</h3>
<p>A buyer who wants to move in a few weeks needs a different pace than one who is thinking about next year. Note the timeline on the form and schedule your follow-up to match. Our <a href="/blog/lead-scoring-criteria-real-estate-agents">lead scoring guide</a> shows one way to rank leads by timeline and readiness.</p>

<h3>Keep the Answers With the Lead</h3>
<p>Store the completed form where you keep the rest of the buyer's details, and track your touches with a <a href="/blog/real-estate-lead-nurture-campaign">lead follow-up tracker</a>. For what to send and when, see our guides on <a href="/blog/how-to-respond-to-real-estate-leads">responding to real estate leads</a> and a <a href="/blog/real-estate-lead-follow-up-sequence">day 1, 3 and 7 follow-up sequence</a>.</p>

<h2>What to Leave Out</h2>

<ul>
<li><strong>Anything about protected characteristics.</strong> Ask about the home and what the buyer needs from it. Do not ask about or record race, color, religion, sex, national origin, disability or family status, or other characteristics protected where you work, and do not steer buyers toward or away from areas. See our guide to <a href="/blog/ai-chatbot-fair-housing-compliance-real-estate">fair housing and AI chat</a> for more on staying compliant online.</li>
<li><strong>Financial advice.</strong> Ask what price range they are comfortable with, and send financing questions to a licensed lender.</li>
<li><strong>Questions you will not use.</strong> A long form puts people off. Cut anything you would not act on, and let buyers skip what they prefer not to answer.</li>
<li><strong>Anything your brokerage restricts.</strong> Check your brokerage's rules, especially on buyer representation agreements and on working with a buyer who already has an agent.</li>
</ul>

<p>This is general guidance, not legal advice.</p>

<!-- next-step -->
<h2>Capture the Inquiry First</h2>

<p>The questionnaire starts once a buyer has reached you. If buyers find you through a listing, a <a href="/real-estate-lead-capture-software">ListingFlare listing page</a> collects their name, email and question into a lead inbox with a conversation thread for each lead, and you can send the questionnaire as your first follow-up. You can <a href="/demo">see the live demo</a> or <a href="/signup">start the 14-day free trial</a>, no credit card needed.</p>

<div class="faq-section">
<h2>Frequently Asked Questions</h2>

<h3>What is a real estate buyer questionnaire?</h3>
<p>A short form an agent uses with a new buyer to learn their timeline, budget, the home they want and how they would like to work, so the agent can start with a clear brief.</p>

<h3>What should a buyer questionnaire include?</h3>
<p>Contact details, timeline, budget and financing status, areas and property type, must-haves, nice-to-haves and deal-breakers, whether they have an agent, and when they can see homes.</p>

<h3>Is there a free buyer questionnaire template?</h3>
<p>Yes. This page offers one as a printable PDF, a fillable PDF and an editable Word file. It has blanks for the buyer's answers, and nothing is prefilled.</p>

<h3>When should I send a buyer questionnaire?</h3>
<p>Send it before the first call, or use it as a guide at the first meeting. Fill in a new copy if the buyer's criteria change.</p>

<h3>Do buyers have to complete every question?</h3>
<p>No. Make it clear that they can skip anything they prefer not to answer, and ask only what you will use.</p>

<h3>What questions should I avoid asking a buyer?</h3>
<p>Avoid questions about protected characteristics such as race, religion, national origin, disability or family status, and avoid steering buyers toward or away from areas. Check your brokerage's policies and local rules. This is general guidance, not legal advice.</p>
</div>
`,
};
