import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

// Force all pages to render dynamically (no static pre-rendering)
// Required because most pages depend on Supabase auth/cookies at runtime
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.listingflare.com"),
  title: {
    default: "ListingFlare — Real Estate Software for Listing Agents | Property Websites & Lead Capture",
    template: "%s | ListingFlare",
  },
  description:
    "Real estate software that helps listing agents create stunning single-property websites, capture leads with AI chatbot, and auto follow-up. The all-in-one listing marketing platform.",
  keywords: [
    "real estate software",
    "realtor software",
    "real estate agent software",
    "real estate listing software",
    "single property website",
    "real estate listing website builder",
    "real estate lead capture",
    "AI chatbot for real estate",
    "property marketing tool",
    "real estate lead generation",
    "listing marketing software",
    "real estate marketing software",
    "real estate agent tools",
    "real estate technology",
    "property website for realtors",
  ],
  alternates: {
    canonical: "https://www.listingflare.com",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ListingFlare",
    title: "ListingFlare — Real Estate Software for Listing Agents",
    description:
      "Real estate software that creates stunning listing pages with AI chatbot, instant lead capture, and auto follow-up.",
    url: "https://www.listingflare.com",
    images: [
      {
        url: "https://www.listingflare.com/icon.svg",
        width: 512,
        height: 512,
        alt: "ListingFlare - Real Estate Software for Listing Agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ListingFlare — Real Estate Software for Listing Agents",
    description:
      "Real estate software with AI-powered listing pages that capture leads and answer buyer questions 24/7.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
