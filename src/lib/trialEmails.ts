// Trial nurture email copy. Kept in Kelvin's voice: casual, no em dashes,
// no corporate fluff, sign-off with Apex/NC + personal phone so agents
// see a real person on the other end.

import { escapeHtml } from "./escapeHtml";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com";

interface AgentEmailContext {
  firstName: string;
}

interface Day12Context extends AgentEmailContext {
  listingCount: number;
  viewCount: number;
  leadCount: number;
}

function plainTextShell(body: string) {
  return `${body}

Best,
Kelvin
Apex, NC
980-395-1212

ListingFlare
${APP_URL}`;
}

function htmlShell(bodyHtml: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:28px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <tr><td style="padding:28px 32px 0;">
          <p style="margin:0;font-family:Georgia,serif;font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:-0.3px;">
            Listing<span style="color:#b8965a;">Flare</span>
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px 28px;font-size:15px;line-height:1.6;color:#374151;">
          ${bodyHtml}
          <p style="margin:24px 0 0;color:#4b5563;">Best,<br/>Kelvin<br/>Apex, NC<br/>980-395-1212</p>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">ListingFlare &middot; <a href="${APP_URL}" style="color:#9ca3af;text-decoration:underline;">${APP_URL.replace(/^https?:\/\//, "")}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function welcomeEmail(ctx: AgentEmailContext) {
  const name = escapeHtml(ctx.firstName || "there");
  const text = plainTextShell(`Hey ${ctx.firstName || "there"},

Kelvin here, founder of ListingFlare. Real quick.

Your 14-day trial just kicked in. You can create your first listing, upload photos, and have buyers chatting with it in about 5 minutes.

If anything feels confusing or broken, just hit reply. This is my actual inbox and I'll help you personally.

No blast, no drip. Just wanted to say welcome and thank you for giving this a shot.`);

  const html = htmlShell(`
    <p style="margin:0 0 14px;">Hey ${name},</p>
    <p style="margin:0 0 14px;">Kelvin here, founder of ListingFlare. Real quick.</p>
    <p style="margin:0 0 14px;">Your 14-day trial just kicked in. You can create your first listing, upload photos, and have buyers chatting with it in about 5 minutes.</p>
    <p style="margin:0 0 14px;">If anything feels confusing or broken, just hit reply. This is my actual inbox and I&rsquo;ll help you personally.</p>
    <p style="margin:0 0 14px;">No blast, no drip. Just wanted to say welcome and thank you for giving this a shot.</p>
    <p style="margin:18px 0 0;">
      <a href="${APP_URL}/dashboard/create" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Create your first listing</a>
    </p>
  `);

  return {
    subject: `Welcome, ${ctx.firstName || "friend"} (quick note from Kelvin)`,
    text,
    html,
  };
}

export function day3StuckEmail(ctx: AgentEmailContext) {
  const name = escapeHtml(ctx.firstName || "there");
  const text = plainTextShell(`Hey ${ctx.firstName || "there"},

Kelvin here. Noticed you haven't created your first listing yet. Totally get it, life's busy.

Two things that might unstick you:

1. 90-second walkthrough: ${APP_URL}/demo
2. Or just hit reply and tell me what's in the way. I'll help you out.

The first listing is the hardest part. Once it's up, everything else clicks.`);

  const html = htmlShell(`
    <p style="margin:0 0 14px;">Hey ${name},</p>
    <p style="margin:0 0 14px;">Kelvin here. Noticed you haven&rsquo;t created your first listing yet. Totally get it, life&rsquo;s busy.</p>
    <p style="margin:0 0 10px;">Two things that might unstick you:</p>
    <ol style="margin:0 0 14px;padding-left:20px;">
      <li style="margin:0 0 6px;">Take a 90 second walkthrough at <a href="${APP_URL}/demo" style="color:#8d7958;">${APP_URL.replace(/^https?:\/\//, "")}/demo</a></li>
      <li style="margin:0 0 6px;">Or just hit reply and tell me what&rsquo;s in the way. I&rsquo;ll help.</li>
    </ol>
    <p style="margin:0 0 14px;">The first listing is the hardest part. Once it&rsquo;s up, everything else clicks.</p>
    <p style="margin:18px 0 0;">
      <a href="${APP_URL}/dashboard/create" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Create your first listing</a>
    </p>
  `);

  return {
    subject: `Stuck on your first listing, ${ctx.firstName || "there"}?`,
    text,
    html,
  };
}

// One-shot re-engagement email for existing signups who joined before
// the product got a lot of new features. Lists the biggest additions
// in plain language so agents know what's new and why it's worth
// another look.
export function reEngageEmail(ctx: AgentEmailContext) {
  const name = escapeHtml(ctx.firstName || "there");

  const features = [
    {
      title: "Full MLS-style property detail pages",
      body: "Price history with a trajectory chart, comparable recent sales you curate, and a mortgage calculator with a live breakdown donut. Buyers get the Zillow experience without leaving your listing.",
    },
    {
      title: "Social Media Pack (one click)",
      body: "Instagram carousel, Story, and Facebook post in one ZIP, plus an AI-written caption with hashtags. Brand-color themed to match your listing. Post in 30 seconds.",
    },
    {
      title: "Per-listing brand color",
      body: "Pick a different accent color for each listing so your beach cottage, your luxury tower, and your craftsman all have their own vibe.",
    },
    {
      title: "Offers management tab",
      body: "Log every offer with buyer info, financing type, earnest money, contingencies, and status (submitted, countered, accepted). Keeps the whole negotiation in one place.",
    },
    {
      title: "Co-listing agents",
      body: "For listings you share with another agent. Both names + license numbers show up on the page and in the legal disclaimer footer.",
    },
    {
      title: "Price-improved badge + live chart",
      body: "When you drop a price in the edit form, the listing page automatically shows a Zillow-style Price Improved pill plus a timeline of every change.",
    },
    {
      title: "License #, Fair Housing + MLS disclaimers",
      body: "Legally required on any real estate ad in most states. Now auto-rendered in a clean footer block on every listing page.",
    },
  ];

  const featuresText = features.map((f, i) => `${i + 1}. ${f.title}\n   ${f.body}`).join("\n\n");

  const text = plainTextShell(`Hey ${ctx.firstName || "there"},

Kelvin here. You signed up for ListingFlare a little while back but I've been heads-down shipping and haven't caught up with you since.

Quick note on what's new, since a lot of it came straight from agent feedback:

${featuresText}

If you still have days left on your trial, none of this costs anything extra, take it for a spin: ${APP_URL}/dashboard

If your trial expired, you can restart it here: ${APP_URL}/dashboard/billing

And if I've missed the mark on what you actually needed, just hit reply. Real inbox, real person, I read every response.`);

  const featuresHtml = features
    .map(
      (f) => `
    <tr><td style="padding:14px 0;border-top:1px solid #f3f4f6;">
      <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:15px;font-weight:700;color:#1a1a1a;">${escapeHtml(f.title)}</p>
      <p style="margin:0;font-size:14px;line-height:1.55;color:#4b5563;">${escapeHtml(f.body)}</p>
    </td></tr>`
    )
    .join("");

  const html = htmlShell(`
    <p style="margin:0 0 14px;">Hey ${name},</p>
    <p style="margin:0 0 14px;">Kelvin here. You signed up for ListingFlare a little while back but I&rsquo;ve been heads-down shipping and haven&rsquo;t caught up with you since.</p>
    <p style="margin:0 0 10px;">Quick note on what&rsquo;s new, since a lot of it came straight from agent feedback:</p>
    <table cellpadding="0" cellspacing="0" width="100%" style="margin:6px 0 18px;">
      ${featuresHtml}
    </table>
    <p style="margin:0 0 14px;">If you still have days left on your trial, none of this costs anything extra. Take it for a spin.</p>
    <p style="margin:18px 0 0;">
      <a href="${APP_URL}/dashboard" style="display:inline-block;background:#b8965a;color:#ffffff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Open my dashboard</a>
    </p>
    <p style="margin:14px 0 0;font-size:13px;color:#6b7280;">If your trial expired, you can restart it <a href="${APP_URL}/dashboard/billing" style="color:#8d7958;">here</a>.</p>
    <p style="margin:14px 0 0;font-size:13px;color:#6b7280;">And if I&rsquo;ve missed the mark on what you actually needed, just hit reply. Real inbox, real person, I read every response.</p>
  `);

  return {
    subject: `${ctx.firstName || "Hey"}, here's what we built since you signed up`,
    text,
    html,
  };
}

export function day12TrialEndingEmail(ctx: Day12Context) {
  const name = escapeHtml(ctx.firstName || "there");
  const stats = [
    ctx.listingCount > 0 ? `${ctx.listingCount} listing${ctx.listingCount !== 1 ? "s" : ""}` : null,
    ctx.viewCount > 0 ? `${ctx.viewCount.toLocaleString()} view${ctx.viewCount !== 1 ? "s" : ""}` : null,
    ctx.leadCount > 0 ? `${ctx.leadCount} lead${ctx.leadCount !== 1 ? "s" : ""}` : null,
  ].filter(Boolean);

  const statsLine =
    stats.length > 0
      ? `Here's what your account pulled together in 12 days: ${stats.join(", ")}.`
      : `You haven't posted a listing yet, but your account is still set up and ready to go.`;

  const text = plainTextShell(`Hey ${ctx.firstName || "there"},

Quick heads up. Your ListingFlare trial ends in 2 days.

${statsLine}

If it's working, upgrading takes 30 seconds: ${APP_URL}/dashboard/billing

If it's not the right fit, totally fine. No hard sell. You can come back anytime.

Either way, I appreciate you giving it a shot.`);

  const html = htmlShell(`
    <p style="margin:0 0 14px;">Hey ${name},</p>
    <p style="margin:0 0 14px;">Quick heads up. Your ListingFlare trial ends in 2 days.</p>
    <p style="margin:0 0 14px;">${escapeHtml(statsLine)}</p>
    <p style="margin:0 0 14px;">If it&rsquo;s working, upgrading takes 30 seconds.</p>
    <p style="margin:0 0 14px;">If it&rsquo;s not the right fit, totally fine. No hard sell. You can come back anytime.</p>
    <p style="margin:0 0 14px;">Either way, I appreciate you giving it a shot.</p>
    <p style="margin:18px 0 0;">
      <a href="${APP_URL}/dashboard/billing" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Upgrade to keep going</a>
    </p>
  `);

  return {
    subject: `Your ListingFlare trial ends in 2 days`,
    text,
    html,
  };
}
