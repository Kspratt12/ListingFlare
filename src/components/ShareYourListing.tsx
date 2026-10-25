"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, Mail, MessageSquare } from "lucide-react";

interface Props {
  /** Path or absolute URL of the published listing page. */
  url: string;
  /** Short label used in the share message, usually "street, city". */
  title: string;
}

// A ready-to-use way to get a published listing in front of buyers: copy the link,
// download a QR code for a sign or flyer, and send or post a pre-written message.
// Agents who publish a page but never share it get views from curiosity and no leads,
// so this sits in the Getting Started checklist right after "publish".
export default function ShareYourListing({ url, title }: Props) {
  const [qr, setQr] = useState<string>("");
  const [copied, setCopied] = useState<"link" | "post" | null>(null);

  const fullUrl =
    typeof window !== "undefined" && url.startsWith("/") ? `${window.location.origin}${url}` : url;
  const post = `New listing: ${title}. See the photos and details, ask questions any time, or book a showing here: ${fullUrl}`;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(fullUrl, { width: 640, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } })
      .then((d) => active && setQr(d))
      .catch(() => active && setQr(""));
    return () => {
      active = false;
    };
  }, [fullUrl]);

  const copy = async (what: "link" | "post") => {
    try {
      await navigator.clipboard.writeText(what === "link" ? fullUrl : post);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      window.prompt("Copy this:", what === "link" ? fullUrl : post);
    }
  };

  const btn =
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50";

  return (
    <div className="rounded-lg border border-brand-100 bg-white p-4">
      <p className="text-sm font-semibold text-gray-900">Put your listing in front of buyers</p>
      <p className="mt-0.5 text-xs text-gray-500">
        A published page only brings in leads when people can reach it. Use the link and QR code below on a sign, a flyer, your social posts and your email signature.
      </p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        {qr && (
          <div className="flex flex-shrink-0 flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`QR code that opens the listing page for ${title}`} className="h-28 w-28 rounded border border-gray-200" />
            <a href={qr} download="listing-qr-code.png" className={btn}>
              <Download className="h-3.5 w-3.5" /> Download QR
            </a>
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Listing link</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <code className="max-w-full truncate rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">{fullUrl}</code>
              <button type="button" onClick={() => copy("link")} className={btn}>
                {copied === "link" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === "link" ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Ready-to-post message</p>
            <p className="mt-1 rounded bg-gray-50 p-2 text-xs leading-relaxed text-gray-600">{post}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => copy("post")} className={btn}>
                {copied === "post" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === "post" ? "Copied" : "Copy message"}
              </button>
              <a href={`sms:?body=${encodeURIComponent(post)}`} className={btn}>
                <MessageSquare className="h-3.5 w-3.5" /> Text it
              </a>
              <a href={`mailto:?subject=${encodeURIComponent(`New listing: ${title}`)}&body=${encodeURIComponent(post)}`} className={btn}>
                <Mail className="h-3.5 w-3.5" /> Email it
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
