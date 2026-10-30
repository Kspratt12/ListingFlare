import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAgentShowingEmail,
  buildBuyerShowingEmail,
  safeMailto,
  sanitizeDisplayName,
  sanitizeHeaderText,
} from "../showingEmails";
import { generateShowingICS } from "../ics";

// Strings that would become live HTML (or break out of an attribute) if they were
// written into an email unencoded.
const PAYLOADS = [
  "<script>alert(1)</script>",
  '"><img src=x onerror=alert(1)>',
  "'><svg/onload=alert(1)>",
  "<a href=\"javascript:alert(1)\">click</a>",
  "</td></tr></table><h1>injected</h1>",
  "<iframe src=//evil.example></iframe>",
];

// Only the tags and attributes our own templates use may exist in the output. Text such as
// "onerror=alert(1)" is harmless once its "<img" has been encoded, so the check is structural:
// every real tag must be a template tag, carry only style/href, and any href must be a mailto:,
// tel: or http(s) URL whose value cannot have been closed early.
const TEMPLATE_TAGS = new Set(["div", "h1", "h2", "p", "table", "tr", "td", "strong", "code", "a"]);
const TEMPLATE_ATTRS = new Set(["style", "href"]);

function assertNoLiveMarkup(html: string, label: string) {
  assert.doesNotMatch(html, /<script|<img|<svg|<iframe|<h1>injected/i, `${label}: injected tag`);
  for (const m of Array.from(html.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g))) {
    const [whole, closing, tag, rest] = m;
    assert.ok(TEMPLATE_TAGS.has(tag.toLowerCase()), `${label}: unexpected tag in ${whole}`);
    if (closing) continue;
    let leftover = rest;
    for (const a of Array.from(rest.matchAll(/\s+([a-zA-Z-]+)="([^"]*)"/g))) {
      const [attr, name, value] = a;
      assert.ok(TEMPLATE_ATTRS.has(name.toLowerCase()), `${label}: unexpected attribute ${name}`);
      if (name.toLowerCase() === "href") {
        assert.match(value, /^(mailto:|tel:|https?:\/\/)/, `${label}: unsafe href ${value}`);
      }
      leftover = leftover.replace(attr, "");
    }
    assert.equal(leftover.trim(), "", `${label}: stray attribute text in ${whole}`);
  }
}

test("the markup check itself fails on unencoded input (so a pass is meaningful)", () => {
  assert.throws(() => assertNoLiveMarkup("<div><img src=x onerror=alert(1)></div>", "control"));
  assert.throws(() => assertNoLiveMarkup('<div><a href="javascript:alert(1)">x</a></div>', "control"));
  assert.throws(() => assertNoLiveMarkup('<div><p onclick="steal()">x</p></div>', "control"));
  assert.throws(() => assertNoLiveMarkup("<div><script>alert(1)</script></div>", "control"));
  assert.doesNotThrow(() => assertNoLiveMarkup('<div style="a:b"><p>&lt;img&gt;</p><a href="mailto:a@b.co">a</a></div>', "control"));
});

test("buyer email: markup in every dynamic field is shown as text, never as HTML", () => {
  for (const p of PAYLOADS) {
    const { html, subject } = buildBuyerShowingEmail({
      buyerName: p,
      listingAddress: p,
      formattedDate: p,
      showingTime: p,
      agentName: p,
      agentPhone: p,
      agentEmail: p,
    });
    assertNoLiveMarkup(html, "buyer");
    assert.ok(html.includes("&lt;"), "payload is present as encoded text");
    assert.doesNotMatch(subject, /[\r\n]/);
  }
});

test("agent email: markup in every dynamic field is shown as text, never as HTML", () => {
  for (const p of PAYLOADS) {
    const { html } = buildAgentShowingEmail({
      buyerName: p,
      buyerEmail: p,
      buyerPhone: p,
      message: p,
      listingAddress: p,
      formattedDate: p,
      showingTime: p,
      dashboardUrl: `https://example.com/${p}`,
    });
    assertNoLiveMarkup(html, "agent");
    assert.doesNotMatch(html, /href="mailto:/i, "no mailto link is built from an invalid address");
    assert.ok(html.includes("&lt;") || html.includes("&quot;"));
  }
});

test("values inside attributes cannot close the attribute", () => {
  const { html } = buildAgentShowingEmail({
    buyerName: "Dana",
    buyerEmail: "dana@example.com",
    listingAddress: "1 Main St",
    formattedDate: "Saturday",
    showingTime: "10:00 AM",
    dashboardUrl: 'https://example.com/leads" onclick="steal()',
  });
  assert.doesNotMatch(html, /onclick="steal\(\)"/);
  assert.match(html, /onclick=&quot;steal\(\)/);
  // a valid address still gets a working mailto link
  assert.match(html, /href="mailto:dana@example\.com"/);
});

test("already-encoded input is encoded again, not trusted", () => {
  const { html } = buildBuyerShowingEmail({
    buyerName: "&lt;b&gt;",
    listingAddress: "1 Main St",
    formattedDate: "Saturday",
    showingTime: "10:00 AM",
    agentName: "Agent",
    agentEmail: "agent@example.com",
  });
  assert.match(html, /&amp;lt;b&amp;gt;/);
});

test("a header-injection attempt cannot put a line break in a subject or display name", () => {
  const attack = "1 Main St\r\nBcc: victim@example.com";
  const buyer = buildBuyerShowingEmail({
    buyerName: "Dana",
    listingAddress: attack,
    formattedDate: "Saturday",
    showingTime: "10:00 AM",
    agentName: "Agent",
    agentEmail: "agent@example.com",
  });
  const agent = buildAgentShowingEmail({
    buyerName: attack,
    buyerEmail: "dana@example.com",
    listingAddress: attack,
    formattedDate: "Saturday",
    showingTime: "10:00 AM",
    dashboardUrl: "https://example.com",
  });
  assert.doesNotMatch(buyer.subject, /[\r\n]/);
  assert.doesNotMatch(agent.subject, /[\r\n]/);
  assert.doesNotMatch(sanitizeHeaderText(attack), /[\r\n]/);

  const display = sanitizeDisplayName('Evil <x@y.com>\r\nBcc: z@example.com "quoted"');
  assert.doesNotMatch(display, /[\r\n<>"]/);
  assert.ok(sanitizeHeaderText("a".repeat(500)).length <= 200);
});

test("safeMailto only builds a link for a valid address", () => {
  assert.equal(safeMailto("dana@example.com"), "mailto:dana@example.com");
  assert.equal(safeMailto('dana@example.com"><script>'), "");
  assert.equal(safeMailto("a@b.com\r\nBcc: x@y.com"), "");
});

// ---- iCalendar attachment ------------------------------------------------

const ALLOWED_LINE = /^(BEGIN:VCALENDAR|VERSION:2\.0|PRODID:|CALSCALE:|METHOD:|BEGIN:VEVENT|UID:|DTSTAMP:|DTSTART:|DTEND:|SUMMARY:|DESCRIPTION:|LOCATION:|ORGANIZER;|ATTENDEE;|STATUS:|SEQUENCE:|TRANSP:|END:VEVENT|END:VCALENDAR| )/;

function invite(over: Partial<Parameters<typeof generateShowingICS>[0]> = {}) {
  return generateShowingICS({
    uid: "abc123",
    date: "2026-11-14",
    time: "10:00 AM",
    summary: "Property Showing - 1 Main St",
    description: "Showing with Dana",
    location: "1 Main St",
    organizerName: "Agent",
    organizerEmail: "agent@example.com",
    attendeeName: "Dana",
    attendeeEmail: "dana@example.com",
    ...over,
  });
}

// Logical lines: long lines are folded as CRLF + space, so unfold before splitting.
function lines(ics: string) {
  return ics.replace(/\r\n /g, "").split("\r\n");
}

test("ics: a normal invite has the expected organizer and attendee", () => {
  const out = lines(invite());
  assert.ok(out.some((l) => l.startsWith('ORGANIZER;CN="Agent":mailto:agent@example.com')));
  assert.ok(out.some((l) => l.includes('ATTENDEE;CN="Dana"') && l.includes("mailto:dana@example.com")));
});

test("ics: line breaks in an address cannot add properties, and the address is left out", () => {
  const evil = "dana@example.com\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nEND:VALARM\r\nATTENDEE:mailto:evil@example.com";
  const ics = invite({ attendeeEmail: evil, organizerEmail: evil });
  const out = lines(ics);
  for (const l of out) assert.match(l, ALLOWED_LINE, `unexpected line: ${JSON.stringify(l)}`);
  assert.doesNotMatch(ics, /VALARM/);
  assert.doesNotMatch(ics, /evil@example\.com/);
  assert.ok(!out.some((l) => l.startsWith("ATTENDEE;")));
  assert.ok(!out.some((l) => l.startsWith("ORGANIZER;")));
});

test("ics: a name or notes with line breaks, colons or quotes cannot add or break out of a property", () => {
  const ics = invite({
    attendeeName: 'Dana";ROLE=CHAIR:mailto:evil@example.com\r\nURL:https://evil.example',
    description: "Notes\r\nURL:https://evil.example\nATTENDEE:mailto:evil@example.com",
    summary: "Showing\r\nBEGIN:VALARM",
    location: "1 Main St\nX-EVIL:1",
  });
  const out = lines(ics);
  for (const l of out) assert.match(l, ALLOWED_LINE, `unexpected line: ${JSON.stringify(l)}`);
  assert.ok(!out.some((l) => l.startsWith("URL:")));
  assert.ok(!out.some((l) => l.startsWith("X-EVIL")));
  assert.ok(!out.some((l) => l.startsWith("BEGIN:VALARM")));
  // (the words may remain inside an escaped text value; what matters is that no line starts with them)
  // the CN value stays one quoted string with the inner quote removed
  const attendee = out.find((l) => l.startsWith("ATTENDEE;")) ?? "";
  assert.match(attendee, /^ATTENDEE;CN="[^"]*";RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:dana@example\.com$/);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
