"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, X, Share2, Check, Link2, Mail, MessageSquare, Printer } from "lucide-react";
import Link from "next/link";

const links = [
  { href: "#details", label: "Details" },
  { href: "#gallery", label: "Gallery" },
  { href: "#agent", label: "Agent" },
  { href: "#contact", label: "Contact" },
];

interface NavbarProps {
  topOffset?: boolean;
  shareTitle?: string;
  shareUrl?: string;
  showPrint?: boolean;
}

export default function Navbar({ topOffset = false, shareTitle, shareUrl, showPrint = false }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fullUrl =
    shareUrl && typeof window !== "undefined" && shareUrl.startsWith("/")
      ? `${window.location.origin}${shareUrl}`
      : shareUrl || "";
  const shareText = shareTitle ? `${shareTitle} - take a look at this listing:` : "";

  const handleShareClick = async () => {
    if (!shareUrl || !shareTitle) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: fullUrl });
        return;
      } catch {
        // user cancelled - fall through to menu
      }
    }
    setShareMenuOpen((v) => !v);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShareMenuOpen(false);
      }, 1500);
    } catch {
      // noop
    }
  };

  const smsHref = `sms:?body=${encodeURIComponent(`${shareText} ${fullUrl}`)}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(shareTitle || "")}&body=${encodeURIComponent(`${shareText}\n\n${fullUrl}`)}`;
  const canShare = Boolean(shareUrl && shareTitle);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className={`fixed left-0 right-0 z-40 transition-all duration-500 ${
        topOffset ? "top-[40px]" : "top-0"
      } ${
        scrolled ? "shadow-lg backdrop-blur-md" : ""
      }`}
      style={
        scrolled
          ? {
              // Same brand-tinted gradient as the dashboard sidebar so
              // the navbar doesn't read as pure black — picks up the
              // agent's theme color through the dark.
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--agent-brand, #b8965a) 22%, rgba(10,10,10,0.95)) 0%, color-mix(in srgb, var(--agent-brand, #b8965a) 14%, rgba(10,10,10,0.95)) 100%)",
            }
          : undefined
      }
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-12">
        {/* Logo - always links home */}
        <Link href="/" className="font-serif text-xl font-bold text-white">
          Listing
          {/* "Flare" uses a brightened mix of the brand color so it stays
              visible when the brand is dark (navy, black, deep red) —
              otherwise dark-on-dark-navbar makes it disappear. */}
          <span style={{ color: "color-mix(in srgb, var(--agent-brand, #b8965a) 55%, white)" }}>
            Flare
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium uppercase tracking-wider text-white/70 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
          {showPrint && (
            <button
              onClick={() => window.print()}
              aria-label="Print this listing"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-white/40 hover:text-white"
            >
              <Printer className="h-4 w-4" />
            </button>
          )}
          {canShare && (
            <div className="relative">
              <button
                onClick={handleShareClick}
                aria-label="Share this listing"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-white/40 hover:text-white"
              >
                <Share2 className="h-4 w-4" />
              </button>
              {shareMenuOpen && (
                <div className="absolute right-0 top-full mt-2 flex min-w-[180px] flex-col gap-0.5 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Link2 className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy link"}
                  </button>
                  <a
                    href={smsHref}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Send via text
                  </a>
                  <a
                    href={mailHref}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email it
                  </a>
                </div>
              )}
            </div>
          )}
          <a
            href="#contact"
            className="rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/20"
          >
            Schedule Showing
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-white md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-white/10 backdrop-blur-md md:hidden"
          style={{
            // Matches the desktop navbar + dashboard sidebar so the
            // whole site reads as one brand-tinted dark surface.
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--agent-brand, #b8965a) 18%, rgba(10,10,10,0.98)) 0%, color-mix(in srgb, var(--agent-brand, #b8965a) 10%, rgba(10,10,10,0.98)) 100%)",
          }}
        >
          <div className="flex flex-col gap-1 px-6 py-4">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium uppercase tracking-wider text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
            {canShare && (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  handleShareClick();
                }}
                className="flex items-center gap-2 rounded-lg px-4 py-3 text-left text-sm font-medium uppercase tracking-wider text-white/70 hover:bg-white/5 hover:text-white"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            )}
            {showPrint && (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  setTimeout(() => window.print(), 300);
                }}
                className="flex items-center gap-2 rounded-lg px-4 py-3 text-left text-sm font-medium uppercase tracking-wider text-white/70 hover:bg-white/5 hover:text-white"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            )}
            <a
              href="#contact"
              onClick={() => setMobileOpen(false)}
              className="mt-2 rounded-lg bg-brand-500 px-4 py-3 text-center text-sm font-medium text-white"
            >
              Schedule Showing
            </a>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}
