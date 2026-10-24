import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Real Estate Lead Capture Software for Agents",
  description:
    "Capture buyer leads from listing pages and open houses, reply instantly and follow up automatically. Lead inbox and QR sign-in. 14-day free trial.",
  alternates: {
    canonical: "https://www.listingflare.com/real-estate-lead-capture-software",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      path="/real-estate-lead-capture-software"
      eyebrow="Lead capture"
      h1="Real Estate Lead Generation and Capture Software"
      intro="ListingFlare is real estate lead generation software built around your listings. It captures the buyers who view your listing pages or sign in at an open house, replies to them right away, and keeps every conversation and follow-up in one place. It does not sell you leads. It makes sure the buyers already looking at your listings do not slip away."
      highlights={[
        "Lead forms and AI chat on every listing page",
        "QR code sign-in for open houses",
        "Instant auto-reply to each new lead, with an optional approval step",
        "Day 1, 3 and 7 follow-up sequences",
        "Two-way inbox, pipeline view and hot, warm and cold scoring",
        "CSV export and a speed-to-lead tracker",
      ]}
      sections={[
        {
          heading: "Where leads come from",
          body: [
            "Buyers reach you from three places: the contact form and showing request on a listing page, the AI chat on that page, and the QR sign-in sheet at an open house. Leads are tagged with where they came from, so you can see which channel is working.",
            "Listing pages can also offer alerts, so a visitor who is not ready to talk can still leave an email address for future listings.",
          ],
        },
        {
          heading: "What happens after someone submits",
          body: [
            "You are notified, and the lead lands in your dashboard with the property they asked about. An AI-written reply goes out right away, or waits for your approval if you turn on Approval Mode. If you do not hear back from them, the follow-up sequence sends messages on days 1, 3 and 7.",
            "Replies come back into a threaded inbox, and you can text a lead from your own phone with one tap. Leads are scored hot, warm or cold, and you can move them through a drag-and-drop pipeline.",
          ],
        },
        {
          heading: "Speed to lead",
          body: [
            "Response speed is widely treated as one of the biggest factors in winning a lead. ListingFlare measures how long you actually take to respond to each lead and compares it with a 47-minute industry average, so you can see your own number rather than guess at it.",
          ],
        },
      ]}
      stepsHeading="How the lead workflow works"
      steps={[
        { title: "A buyer visits your listing page or scans the open house QR code", text: "They ask a question in chat, request a showing, or fill in the sign-in form." },
        { title: "The lead is saved with its source and property", text: "Name, email, phone and what they asked about appear in your dashboard." },
        { title: "An auto-reply goes out", text: "Written by AI from the listing details. Turn on Approval Mode to review each one before it sends." },
        { title: "Follow-up runs on a schedule", text: "Day 1, 3 and 7 messages go out unless you take over the conversation." },
        { title: "You work the pipeline", text: "Reply from the inbox, book the showing, update the status, and export to CSV if you need the data elsewhere." },
      ]}
      limits={{
        heading: "What to know before you sign up",
        items: [
          "ListingFlare is built around your listings. It is not a tool for buying leads or running ad campaigns.",
          "Follow-up messages are written by AI. Use Approval Mode if you want to read them before they go out.",
          "You are responsible for following the email and text consent rules that apply to your leads.",
          "If you already run a full CRM, plan how you would move leads over. CSV export is available.",
        ],
      }}
      faqs={[
        { question: "What is lead capture software for real estate?", answer: "It collects contact details from people interested in a property, from forms, chat or open house sign-ins, and helps you respond and follow up." },
        { question: "Can it capture open house leads?", answer: "Yes. Each listing can generate a QR code sign-in page and a printable flyer. Visitors who sign in become leads in your dashboard." },
        { question: "Does it send follow-ups automatically?", answer: "Yes. A day 1, 3 and 7 sequence is included, and you can require approval before messages send." },
        { question: "How much does it cost?", answer: "$150 per month with a 14-day free trial and no credit card required to start." },
        { question: "Does it replace my CRM?", answer: "It includes an inbox, pipeline and scoring for the leads it captures. If you use another CRM for everything else, you can export leads to CSV." },
      ]}
      related={[
        { href: "/single-property-website-builder", label: "Single property website builder" },
        { href: "/real-estate-ai-chatbot", label: "AI chatbot for real estate listings" },
        { href: "/blog/how-listing-agents-capture-buyer-leads", label: "How listing agents capture buyer leads" },
        { href: "/blog/best-lead-generation-tools-for-real-estate-agents", label: "Best lead generation tools for real estate agents" },
        { href: "/blog/open-house-sign-in-sheet-vs-qr-code", label: "Open house sign-in sheet vs. QR code" },
        { href: "/blog/lead-scoring-criteria-real-estate-agents", label: "Lead scoring criteria for real estate agents" },
        { href: "/pricing", label: "ListingFlare pricing" },
      ]}
    />
  );
}
