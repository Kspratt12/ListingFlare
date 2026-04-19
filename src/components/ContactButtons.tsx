"use client";

import { Phone, MessageSquare, Mail } from "lucide-react";
import { buildCallLink, buildSmsLink, buildEmailLink } from "@/lib/contactLinks";

interface Props {
  phone?: string | null;
  email?: string | null;
  // Pre-filled message body for the SMS draft
  smsBody?: string;
  // Pre-filled subject/body for the email draft
  emailSubject?: string;
  emailBody?: string;
  // Visual size - "sm" for inline list rows, "md" for panels
  size?: "sm" | "md";
  // Show labels alongside the icons
  showLabels?: boolean;
  // Allow caller to stop event bubbling when used inside clickable rows
  stopPropagation?: boolean;
  // Show a small hint under the buttons (useful on desktop where sms: is inert)
  showHint?: boolean;
}

export default function ContactButtons({
  phone,
  email,
  smsBody,
  emailSubject,
  emailBody,
  size = "md",
  showLabels = false,
  stopPropagation = false,
  showHint = false,
}: Props) {
  const callLink = buildCallLink(phone);
  const smsLink = buildSmsLink(phone, smsBody);
  const emailLink = buildEmailLink(email, emailSubject, emailBody);

  if (!callLink && !smsLink && !emailLink) return null;

  const hasPhoneAction = Boolean(callLink || smsLink);

  const handleClick = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
  };

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const pad = size === "sm" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs";

  return (
    <div className="space-y-1.5">
    <div className="flex items-center gap-1.5">
      {callLink && (
        <a
          href={callLink}
          onClick={handleClick}
          className={`inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white ${pad} font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50`}
          title="Call"
        >
          <Phone className={iconSize} />
          {showLabels && <span>Call</span>}
        </a>
      )}
      {smsLink && (
        <a
          href={smsLink}
          onClick={handleClick}
          className={`inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 ${pad} font-medium text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100`}
          title="Text (opens Messages on your phone / Mac)"
        >
          <MessageSquare className={iconSize} />
          {showLabels && <span>Text</span>}
        </a>
      )}
      {emailLink && (
        <a
          href={emailLink}
          onClick={handleClick}
          className={`inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white ${pad} font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50`}
          title="Email"
        >
          <Mail className={iconSize} />
          {showLabels && <span>Email</span>}
        </a>
      )}
    </div>
    {showHint && hasPhoneAction && (
      <p className="text-[10px] text-gray-400">
        Call and Text open your phone&apos;s apps. Best used on mobile.
      </p>
    )}
    </div>
  );
}
