import { BlogPost } from "@/lib/blog";

export const article: BlogPost = {
  slug: "listing-page-analytics-what-to-track",
  title: "Listing Page Analytics: What Agents Should Track",
  description:
    "The listing page metrics that matter: visits by source, actions, returning viewers and showings, how to read them and how to turn them into seller updates.",
  date: "2026-10-25",
  author: "ListingFlare Team",
  category: "Listing Marketing",
  keywords: [
    "listing page analytics",
    "real estate listing analytics",
    "track real estate listing views",
    "what metrics to track real estate listing",
    "seller report listing activity",
    "real estate marketing metrics",
  ],
  readingTime: 8,
  coverImage:
    "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&h=630&fit=crop&q=80",
  coverImageAlt:
    "Dashboard showing listing page visits and showing requests",
  content: `
<p>Sellers ask the same question every week: &ldquo;What is happening with my listing?&rdquo; If your answer is &ldquo;no news,&rdquo; you are missing what the data could tell you. A few numbers, tracked consistently, show whether the problem is visibility, price or presentation, and they give you something concrete to bring to the conversation. This guide lists what to track and how to read it.</p>

<h2>The Five Numbers That Matter</h2>

<ol>
<li><strong>Visits to your listing page</strong> (and where they come from)</li>
<li><strong>Actions taken</strong> (chat questions, showing requests, form fills)</li>
<li><strong>Returning viewers</strong> (people who come back)</li>
<li><strong>Showings and feedback</strong></li>
<li><strong>Offers or inquiries from other agents</strong></li>
</ol>

<p>Vanity numbers, such as raw page views alone, mean little. The ratios between these tell the story.</p>

<h2>1. Visits by Source</h2>

<p>Know where traffic comes from: yard sign QR scans, social, email, flyers, search and portals. Add a tracking tag to each link so you can separate them. See <a href="/blog/real-estate-yard-sign-qr-code">yard sign QR codes</a> for how. If traffic is low, the fix is marketing. If traffic is fine but nobody acts, the fix is the page or the price.</p>

<h2>2. Actions Per Visit</h2>

<p>Divide actions by visits. If many people visit and few ask a question or request a showing, look at:</p>

<ul>
<li>The price relative to similar homes</li>
<li>Photo quality and order (the first photo matters most)</li>
<li>Missing information that buyers want (see <a href="/blog/listing-faq-questions-buyers-ask">25 buyer questions</a>)</li>
<li>A hidden or unclear call to action (see <a href="/blog/real-estate-lead-capture-form-best-practices">form best practices</a>)</li>
</ul>

<h2>3. Returning Viewers</h2>

<p>Someone who comes back to a listing three or more times is a strong signal. They are comparing it, showing it to a partner or building up to a decision. That is the lead to contact personally. ListingFlare flags returning buyers with hot visitor alerts for exactly this reason. See <a href="/blog/lead-scoring-criteria-real-estate-agents">lead scoring criteria</a>.</p>

<h2>4. Showings and Feedback</h2>

<p>Count showings requested, showings held and the reasons buyers give afterward. Three or four consistent comments about price, layout or condition are more useful than any dashboard. See <a href="/blog/best-showing-scheduling-software-real-estate">showing scheduling and feedback</a>.</p>

<h2>5. Compare to Expectations</h2>

<p>A benchmark for your own area beats a national one. After a few listings, you will know what a normal first two weeks look like for a home at that price point. Track:</p>

<table>
<thead>
<tr><th>Measure</th><th>Week 1</th><th>Week 2</th><th>Week 3</th></tr>
</thead>
<tbody>
<tr><td>Page visits</td><td></td><td></td><td></td></tr>
<tr><td>Chat questions</td><td></td><td></td><td></td></tr>
<tr><td>Showing requests</td><td></td><td></td><td></td></tr>
<tr><td>Showings held</td><td></td><td></td><td></td></tr>
<tr><td>Offers</td><td></td><td></td><td></td></tr>
</tbody>
</table>

<h2>How to Read the Pattern</h2>

<table>
<thead>
<tr><th>What you see</th><th>Likely issue</th><th>What to try</th></tr>
</thead>
<tbody>
<tr><td>Low visits</td><td>Visibility</td><td>More sharing, QR codes, open house, social</td></tr>
<tr><td>Visits but few actions</td><td>Price or presentation</td><td>Review photos, details and the call to action</td></tr>
<tr><td>Actions but few showings</td><td>Follow-up gap</td><td>Reply faster, offer specific times</td></tr>
<tr><td>Showings but no offers</td><td>Price or condition</td><td>Gather feedback, discuss a change</td></tr>
</tbody>
</table>

<p>If the pattern points to price, our <a href="/blog/seller-price-reduction-scripts">seller price reduction scripts</a> help you have the conversation.</p>

<h2>Turn the Numbers Into a Seller Update</h2>

<p>A short weekly update with these numbers builds trust and justifies your recommendations. The <a href="/blog/seller-update-report-template">seller update report template</a> is free. ListingFlare also includes a seller transparency portal where your clients can watch their listing activity live, which reduces the number of &ldquo;any news?&rdquo; messages.</p>

<h2>Keep It Honest</h2>

<ul>
<li>Do not show a seller numbers you cannot explain.</li>
<li>Protect buyer privacy. Share counts, not names.</li>
<li>Do not promise outcomes based on a few days of data.</li>
</ul>

<!-- expanded --><h2>A Worked Example (Illustrative Numbers)</h2>
<p>These numbers are made up to show how to read the pattern. Use your own.</p>
<table>
<thead>
<tr><th>Measure</th><th>Week 1</th><th>Week 2</th><th>Week 3</th></tr>
</thead>
<tbody>
<tr><td>Page visits</td><td>240</td><td>180</td><td>120</td></tr>
<tr><td>Chat questions</td><td>9</td><td>6</td><td>3</td></tr>
<tr><td>Showing requests</td><td>5</td><td>2</td><td>1</td></tr>
<tr><td>Showings held</td><td>4</td><td>2</td><td>1</td></tr>
<tr><td>Offers</td><td>0</td><td>0</td><td>0</td></tr>
</tbody>
</table>
<p><strong>How to read it:</strong> visits fall each week, which is normal as a listing ages, but the ratio of showing requests to visits (about 2% in week 1, around 1% by week 3) is falling too. People who do see it are not acting. With no offers after four showings, the likely lessons are price or condition. The right move is to collect the feedback from those four showings and bring it to the seller with the numbers.</p>

<h2>Where to Get the Data</h2>
<ul>
<li><strong>Your listing platform&rsquo;s analytics</strong> for visits, chat questions, showing requests and returning viewers.</li>
<li><strong>A general analytics tool</strong> if you build your own page, so you can see traffic sources.</li>
<li><strong>Your calendar and showing tool</strong> for showings held.</li>
<li><strong>Your own notes</strong> for feedback. Nothing replaces writing down what buyers actually said.</li>
</ul>

<h2>Tag Every Link You Share</h2>
<p>If every link to the listing looks the same, you cannot tell what worked. Add a short source tag to each one: one for the yard sign QR code, one for the flyer, one for each social post, one for email. After two weeks you can answer a seller who asks, &ldquo;Is the sign doing anything?&rdquo; with a number instead of a guess.</p>

<h2>Privacy: Share Counts, Not Identities</h2>
<ul>
<li>Show sellers totals and trends, not the names of individual buyers.</li>
<li>Keep buyer contact details inside your own system.</li>
<li>If you use analytics cookies on your own site, follow your local disclosure rules.</li>
</ul>

<h2>Common Mistakes</h2>
<ul>
<li><strong>Celebrating views.</strong> A thousand views and no showings means something is wrong.</li>
<li><strong>Judging after three days.</strong> Give a listing a full week or two before drawing conclusions, unless something is clearly broken.</li>
<li><strong>Changing five things at once.</strong> Change one thing, then wait, so you know what worked.</li>
<li><strong>Hiding bad news.</strong> A seller who sees the numbers early accepts a price conversation more easily than one who is surprised at week six.</li>
</ul>

<h2>A Weekly Seller Message in Four Lines</h2>
<blockquote>This week: [x] visits, [y] questions and [z] showing requests. Showings held: [n]. Feedback themes: [one or two]. My recommendation: [one clear action].</blockquote>
<p>Short, specific and honest beats long and glossy. The <a href="/blog/seller-update-report-template">free seller update report</a> gives you a fuller version.</p>

<h2>Where ListingFlare Helps</h2>

<p>ListingFlare listing pages include analytics for visits and actions, hot visitor alerts when a buyer comes back repeatedly, and a seller portal so you can share progress without writing a report. <a href="/demo">See it live</a> or read <a href="/blog/best-real-estate-software-for-listing-agents">best real estate software for listing agents</a>.</p>

<div class="faq-section">
<h2>Frequently Asked Questions</h2>

<h3>What listing metrics matter most?</h3>
<p>Visits by source, actions per visit, returning viewers, showings and feedback. Ratios matter more than raw views.</p>

<h3>How do I track where listing visitors come from?</h3>
<p>Use a separate tracking tag on each link, such as the yard sign, flyer, social post and email, so your analytics separate them.</p>

<h3>How often should I send sellers an update?</h3>
<p>Weekly is common, with a quick call when something changes.</p>

<h3>What does a lot of views but no showings mean?</h3>
<p>It often points to price or presentation. Review the photos, details, call to action and price against comparable homes.</p>
<h3>How long should I wait before changing my approach?</h3>
<p>Give a new listing a full week or two of data unless something is clearly broken, such as a bad lead photo or a missing call to action.</p>

<h3>What is a good number of showings per week?</h3>
<p>It varies widely by price, area and season. Compare against your own recent listings in the same market.</p>

</div>
`,
};
