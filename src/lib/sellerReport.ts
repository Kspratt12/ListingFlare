// Seller report metrics: what the agent can send to their seller about one listing.
//
// Every number has a stated period and a plain-language definition, zero is shown as zero, and no
// buyer names, contact details or chat transcripts are included.
//
// What is NOT available, and therefore never shown or estimated:
//  - views per week/period: only a running total is stored (listings.view_count)
//  - unique visitors, time on page, traffic sources for views

export interface SellerReportInput {
  now: Date;
  periodDays?: number;
  listing: { created_at: string; published_at?: string | null; status: string; view_count?: number | null };
  // Only timestamps are passed in: the report never sees who the buyers are.
  leadCreatedAt: string[];
  showings: Array<{ status: string; created_at: string }>;
  automation: {
    aiChatOn: boolean;
    calendarConnected: boolean;
    followUpEmailsOn: boolean;
    approvalMode: boolean;
  };
}

export interface ReportMetric {
  key: string;
  label: string;
  value: number;
  scope: "period" | "since_live";
  definition: string;
}

export interface SellerReport {
  period: { start: string; end: string; days: number; label: string };
  liveSince: string | null;
  metrics: ReportMetric[];
  running: string[];
  summary: string;
  notes: string[];
}

const DAY = 24 * 60 * 60 * 1000;
const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// Requests the agent has not turned down. Declined and canceled requests are excluded.
const SHOWING_REQUESTED = new Set(["requested", "confirmed", "completed", "no_show"]);
const SHOWING_CONFIRMED = new Set(["confirmed", "completed", "no_show"]);

export function buildSellerReport(i: SellerReportInput): SellerReport {
  const days = i.periodDays && i.periodDays > 0 ? Math.floor(i.periodDays) : 7;
  const end = i.now;
  const start = new Date(end.getTime() - days * DAY);
  const inPeriod = (iso: string) => {
    const t = new Date(iso).getTime();
    return Number.isFinite(t) && t >= start.getTime() && t <= end.getTime();
  };
  const liveSince = i.listing.published_at || null;

  const leadsPeriod = i.leadCreatedAt.filter(inPeriod).length;
  const leadsTotal = i.leadCreatedAt.length;
  const requested = i.showings.filter((s) => SHOWING_REQUESTED.has(s.status));
  const confirmed = i.showings.filter((s) => SHOWING_CONFIRMED.has(s.status));
  const views = Math.max(0, Math.floor(i.listing.view_count || 0));

  const metrics: ReportMetric[] = [
    {
      key: "views_total",
      label: "Listing page views",
      value: views,
      scope: "since_live",
      definition: "Total page loads since the page was created. Not unique visitors. Excludes the agent's own signed-in visits and known bots. Views are not broken down by week.",
    },
    {
      key: "inquiries_period",
      label: `Buyer inquiries, last ${days} days`,
      value: leadsPeriod,
      scope: "period",
      definition: "People who sent their contact details through the listing page (inquiry form, chat or showing request) during this period.",
    },
    {
      key: "inquiries_total",
      label: "Buyer inquiries, total",
      value: leadsTotal,
      scope: "since_live",
      definition: "All inquiries received for this listing so far.",
    },
    {
      key: "showings_requested_period",
      label: `Showing requests, last ${days} days`,
      value: requested.filter((s) => inPeriod(s.created_at)).length,
      scope: "period",
      definition: "Showing requests made during this period, not counting requests that were declined or canceled.",
    },
    {
      key: "showings_confirmed_total",
      label: "Showings confirmed, total",
      value: confirmed.length,
      scope: "since_live",
      definition: "Showings the agent confirmed (including ones that already took place). Requests still awaiting a reply are not counted.",
    },
  ];

  const running: string[] = [];
  if (i.automation.aiChatOn) running.push("An AI assistant answers buyer questions on the listing page from the details the agent approved.");
  running.push("Buyers can request a showing from the listing page; the agent confirms each one.");
  if (i.automation.calendarConnected) running.push("Confirmed showings are added to the agent's Google Calendar.");
  if (i.automation.followUpEmailsOn && !i.automation.approvalMode) running.push("Buyers who inquire receive scheduled follow-up emails.");
  if (i.automation.approvalMode) running.push("The agent reviews AI-drafted replies before they are sent.");

  const isLive = !["draft", "archived"].includes(i.listing.status);
  let summary: string;
  if (!isLive) {
    summary = "The listing page is not public yet, so there is no buyer activity to report.";
  } else if (views === 0 && leadsTotal === 0) {
    summary = "The listing page is live. No views or inquiries have been recorded yet.";
  } else {
    summary = `So far the listing page has ${views.toLocaleString("en-US")} view${views === 1 ? "" : "s"} and ${leadsTotal} buyer inquir${leadsTotal === 1 ? "y" : "ies"}; ${leadsPeriod} of those inquiries came in the last ${days} days.`;
  }

  return {
    period: { start: start.toISOString(), end: end.toISOString(), days, label: `${fmt(start)} – ${fmt(end)}` },
    liveSince,
    metrics,
    running,
    summary,
    notes: [
      "Buyer names, contact details and conversations are not included in this report.",
      "Counts come from activity on the ListingFlare listing page only, not from MLS, portals or other marketing.",
    ],
  };
}
