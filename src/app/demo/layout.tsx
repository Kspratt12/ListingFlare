import type { Metadata } from "next";

// The demo page is a client component, so its metadata lives in this layout.
// Without it, /demo inherited the homepage title and description.
export const metadata: Metadata = {
  title: "Live Real Estate Software Demo",
  description:
    "Try the ListingFlare demo: a live single-property website with photo gallery, AI chat assistant, showing scheduler, and lead capture, built for listing agents.",
  alternates: {
    canonical: "https://www.listingflare.com/demo",
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
