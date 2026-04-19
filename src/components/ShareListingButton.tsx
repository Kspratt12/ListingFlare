"use client";

import { useState } from "react";
import { Share2, Link2, Check, Mail, MessageSquare } from "lucide-react";

interface Props {
  title: string;
  url: string;
}

// Floating share button in the bottom-right of the listing page.
// Prefers native Web Share API on mobile; falls back to a menu with
// copy-link + SMS + email on desktop.
export default function ShareListingButton({ title, url }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== "undefined" && url.startsWith("/") ? `${window.location.origin}${url}` : url;
  const shareText = `${title} - take a look at this listing:`;

  const handleClick = async () => {
    // Try native share first (mobile + some desktops)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: fullUrl });
        return;
      } catch {
        // user cancelled or share failed; fall through to menu
      }
    }
    setOpen((v) => !v);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
    } catch {
      // noop
    }
  };

  const smsHref = `sms:?body=${encodeURIComponent(`${shareText} ${fullUrl}`)}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${shareText}\n\n${fullUrl}`)}`;

  return (
    <div className="fixed bottom-24 right-6 z-40 md:bottom-24">
      {open && (
        <div className="mb-2 flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
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
      <button
        onClick={handleClick}
        aria-label="Share this listing"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-950 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <Share2 className="h-5 w-5" />
      </button>
    </div>
  );
}
