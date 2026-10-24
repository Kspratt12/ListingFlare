import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start Your 14-Day Free Trial",
  description:
    "Create your ListingFlare account and publish your first branded listing website in minutes. 14-day free trial, no credit card required.",
  alternates: {
    canonical: "https://www.listingflare.com/signup",
  },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
