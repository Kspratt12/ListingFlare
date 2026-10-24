import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Single Property Website Builder for Agents",
  description:
    "Build a single property website for each listing in minutes: your photos, your contact info, AI chat and lead capture. 14-day free trial.",
  alternates: {
    canonical: "https://www.listingflare.com/single-property-website-builder",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      path="/single-property-website-builder"
      eyebrow="Single property website builder"
      h1="Single Property Website Builder for Real Estate Agents"
      intro="ListingFlare is a real estate website builder made for one job: giving each of your listings its own branded single property website. Add the property details and photos, publish, and share one link with buyers, sellers and your social audience. Every inquiry goes to you, not to a portal."
      highlights={[
        "A separate branded page for every listing",
        "Your name, headshot, brokerage and contact info on every page",
        "Photo gallery, video uploads and virtual tour embeds (Matterport, Kuula, 360)",
        "Mobile-friendly layouts with a share link",
        "Mortgage calculator and neighborhood info on the page",
        "Unlimited listings on one flat plan",
      ]}
      sections={[
        {
          heading: "Why give each listing its own single property website",
          body: [
            "On a portal such as Zillow, your listing sits beside other agents' ads and buyer inquiries can be routed to someone else. A single-property website puts one home, one agent and one contact path on the page.",
            "It also gives you something concrete to show a seller at a listing presentation: here is the page your home will have, and here is where your leads will land.",
          ],
        },
        {
          heading: "What is on a ListingFlare listing page",
          body: [
            "Each page has a photo gallery, price, beds, baths and square footage, a description, property attributes, a mortgage calculator, neighborhood information, your branding and a way to request a showing or ask a question. Pages have standard page titles, descriptions and RealEstateListing structured data, so search engines can read them.",
            "Published listings are also grouped on city pages at listingflare.com/homes/your-city. A city page is only indexed by search engines once it has at least three listings, so thin pages stay out of Google.",
          ],
        },
        {
          heading: "How it compares with an MLS listing or a portal",
          body: [
            "A listing website does not replace the MLS. The MLS is how your listing reaches other agents and the portals. A listing website is the page you control, which you send traffic to from social posts, email, flyers and signs.",
          ],
        },
      ]}
      stepsHeading="How to publish a listing page"
      steps={[
        { title: "Enter the property details", text: "Address, price, beds, baths, square footage and features. The AI can draft the listing description and photo captions for you to edit." },
        { title: "Upload photos and optional video or tour", text: "Drag photos into order, add videos, or paste a virtual tour link." },
        { title: "Set your branding", text: "Your headshot, brokerage, contact details and brand color appear on every page." },
        { title: "Publish and share", text: "You get a shareable URL right away. Add it to social posts, email, your signature and your open house flyer." },
      ]}
      limits={{
        heading: "What to know before you sign up",
        items: [
          "ListingFlare is a listing marketing tool. It does not syndicate your listing to the MLS or to portals.",
          "Pages live on listingflare.com. A custom domain option is not listed on the pricing page today.",
          "You are responsible for the accuracy of the listing details and for the license, brokerage and fair housing disclosures your state or MLS requires.",
        ],
      }}
      faqs={[
        { question: "How long does it take to create a single property website?", answer: "Most of the time goes into gathering photos and details. Once you have those, publishing takes a few minutes." },
        { question: "How much does it cost?", answer: "$150 per month for unlimited listing websites, with a 14-day free trial and no credit card required to start." },
        { question: "Do I need technical skills?", answer: "No. You fill in a form and upload photos. There is no code or design work." },
        { question: "Can I use my own branding?", answer: "Yes. Your headshot, name, brokerage and brand color appear on each listing page." },
        { question: "Is this different from a regular agent website?", answer: "A regular agent website is one site for you. This gives each property its own page, built to show one home and capture inquiries for it." },
      ]}
      related={[
        { href: "/real-estate-lead-capture-software", label: "Real estate lead capture software" },
        { href: "/real-estate-ai-chatbot", label: "AI chatbot for real estate listings" },
        { href: "/blog/how-to-create-a-single-property-website", label: "How to create a single property website: the complete guide" },
        { href: "/blog/best-single-property-website-builders", label: "Best single property website builders compared" },
        { href: "/blog/single-property-website-vs-zillow-showcase", label: "Single property website vs. Zillow Showcase" },
        { href: "/listingflare-vs-rela", label: "ListingFlare vs Rela" },
        { href: "/listingflare-vs-singlepropertysites", label: "ListingFlare vs SinglePropertySites.com" },
        { href: "/pricing", label: "ListingFlare pricing" },
      ]}
    />
  );
}
