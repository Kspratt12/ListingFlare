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
    default: "ListingFlare — Single Property Websites for Real Estate Agents",
    template: "%s | ListingFlare",
  },
  description:
    "Create stunning single-property listing websites in minutes. AI chatbot answers buyer questions 24/7, captures leads instantly, and auto-follows up so you never miss a deal.",
  keywords: [
    "single property website",
    "real estate listing website builder",
    "single property listing website",
    "real estate lead capture",
    "AI chatbot for real estate",
    "property marketing tool",
    "real estate lead generation",
    "listing marketing for agents",
    "real estate listing page",
    "property website for realtors",
  ],
  alternates: {
    canonical: "https://www.listingflare.com",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ListingFlare",
    title: "ListingFlare — Single Property Websites for Real Estate Agents",
    description:
      "Create stunning listing pages with AI chatbot, instant lead capture, and auto follow-up. Your buyers get answers 24/7.",
    url: "https://www.listingflare.com",
    images: [
      {
        url: "https://www.listingflare.com/icon.svg",
        width: 512,
        height: 512,
        alt: "ListingFlare - Single Property Websites for Real Estate Agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ListingFlare — Single Property Websites for Real Estate Agents",
    description:
      "AI-powered listing pages that capture leads and answer buyer questions 24/7.",
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
