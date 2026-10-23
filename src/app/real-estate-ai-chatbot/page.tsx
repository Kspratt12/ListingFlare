import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "AI Chatbot for Real Estate Listings",
  description:
    "An AI assistant on every listing page answers buyer questions from your property details, collects contact info and points buyers to a showing. See what it can and can't do.",
  alternates: {
    canonical: "https://www.listingflare.com/real-estate-ai-chatbot",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      path="/real-estate-ai-chatbot"
      eyebrow="AI chat for listings"
      h1="AI Chatbot for Real Estate Listings"
      intro="Every ListingFlare listing page includes a chat assistant that answers buyer questions from the details you entered, collects their contact information, and points them to a showing. It works when you are in a meeting or asleep."
      highlights={[
        "Answers from your listing details: beds, baths, size, features, description",
        "Says it needs to check when it does not have the answer",
        "Shares your scheduling link when a buyer wants to see the home",
        "Collects name, email and phone so you can follow up",
        "Included on every listing page, no per-chat fees",
        "Every conversation lands in your lead dashboard",
      ]}
      sections={[
        {
          heading: "What the assistant does",
          body: [
            "When a buyer asks about the home, the assistant replies in a few short sentences using the information in your listing: price, bedrooms, bathrooms, square footage, year built, lot size, description and features.",
            "If a buyer is interested, it invites them to book a showing with your scheduling link, or asks for their name and number so you can reach out. You see the lead and the conversation in your dashboard.",
          ],
        },
        {
          heading: "Why listing-specific matters",
          body: [
            "A generic website chatbot does not know the property. This one is given the listing it is sitting on, so answers can reference the actual kitchen, bedrooms or lot instead of generic phrases.",
            "The quality of its answers depends on the quality of your listing. The more complete the details and description, the better it performs.",
          ],
        },
      ]}
      stepsHeading="How it works on your listing"
      steps={[
        { title: "You publish a listing with full details", text: "The assistant only knows what is in the listing, so add features and a good description." },
        { title: "A buyer asks a question", text: "They type into the chat on the listing page and get an answer in seconds." },
        { title: "The assistant guides next steps", text: "If the buyer wants to see the home, it shares your scheduling link or asks for contact details." },
        { title: "You get the lead", text: "The buyer appears in your dashboard with the conversation, and your auto-reply and follow-up sequence can take it from there." },
      ]}
      limits={{
        heading: "What the AI can and cannot do",
        items: [
          "It can answer questions about facts in the listing. It cannot know things you did not enter, such as HOA fees, school assignments or utility costs. In that case it offers to get the answer from you.",
          "It is not a substitute for you. It does not negotiate or give legal, financial or fair housing advice, and it cannot make promises on your behalf.",
          "Chat messages per visitor are rate limited to protect against abuse.",
          "AI can occasionally be wrong. Keep your listing details accurate and review conversations in your dashboard.",
        ],
      }}
      faqs={[
        { question: "What does a real estate AI chatbot do?", answer: "It answers common buyer questions about a property, captures their contact details and moves interested buyers toward a showing." },
        { question: "Will it make up details about the property?", answer: "It is instructed to use only the information in your listing and to say it needs to check when it does not know. Because AI can still make mistakes, review conversations and keep your listing accurate." },
        { question: "Can it book showings?", answer: "It shares your scheduling link when a buyer wants to see the home, and listing pages also have a showing request option." },
        { question: "Does it cost extra?", answer: "No. It is included in the $150 per month plan, which has a 14-day free trial and no credit card required to start." },
        { question: "Where do the leads go?", answer: "Straight to your ListingFlare dashboard, where you can reply, score and follow up." },
      ]}
      related={[
        { href: "/real-estate-lead-capture-software", label: "Real estate lead capture software" },
        { href: "/real-estate-listing-website-builder", label: "Real estate listing website builder" },
        { href: "/blog/ai-for-real-estate-agents", label: "AI for real estate agents" },
        { href: "/blog/best-ai-isa-tools-real-estate", label: "Best AI ISA tools for real estate" },
        { href: "/blog/how-to-stop-losing-leads-to-zillow", label: "How to stop losing leads to Zillow" },
        { href: "/demo", label: "Try the live demo" },
      ]}
    />
  );
}
