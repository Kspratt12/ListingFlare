import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
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

// NOTE: Do NOT set force-dynamic here - it would prevent blog pages and
// other static content from being cached/pre-rendered at build time,
// hurting SEO and Core Web Vitals. Pages that need runtime data (dashboard,
// listing pages) set their own `export const dynamic = "force-dynamic"`.

export const metadata: Metadata = {
  metadataBase: new URL("https://www.listingflare.com"),
  title: {
    default: "ListingFlare - Real Estate Software for Listing Agents | Property Websites & Lead Capture",
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
    "realtor ai",
    "ai for realtors",
    "real estate ai tools",
    "property website for realtors",
  ],
  alternates: {
    canonical: "https://www.listingflare.com",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ListingFlare",
    title: "ListingFlare - Real Estate Software for Listing Agents",
    description:
      "Real estate software that creates stunning listing pages with AI chatbot, instant lead capture, and auto follow-up.",
    url: "https://www.listingflare.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "ListingFlare - Real Estate Software for Listing Agents",
    description:
      "Real estate software with AI-powered listing pages that capture leads and answer buyer questions 24/7.",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ListingFlare",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        {/* Preconnect to external origins for faster resource loading (LCP) */}
        <link rel="preconnect" href="https://pvnsirpfofxklqgxwdiz.supabase.co" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://pvnsirpfofxklqgxwdiz.supabase.co" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className="font-sans antialiased">
        {/* Skip to main content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-gray-950 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <div id="main-content">{children}</div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
