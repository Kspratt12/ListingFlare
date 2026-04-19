// Build native URI schemes for calling, texting, and emailing. These open
// the user's default handler: SMS app (iOS/Android/Mac with iMessage),
// phone app, or email client. No backend, no Twilio, no per-number fees -
// the agent texts from their real number, reply lands on their phone.

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;
  // Assume US if 10 digits; if already 11 with leading 1, keep it
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  // For anything else, return as-is with + prefix
  return `+${digits}`;
}

export function buildSmsLink(phone: string | null | undefined, body?: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  if (!body) return `sms:${normalized}`;
  // iOS uses &body=, Android uses ?body= - ?body= works on both when no other params
  return `sms:${normalized}?body=${encodeURIComponent(body)}`;
}

export function buildCallLink(phone: string | null | undefined): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return `tel:${normalized}`;
}

export function buildEmailLink(
  email: string | null | undefined,
  subject?: string,
  body?: string
): string | null {
  if (!email) return null;
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return params.length > 0 ? `mailto:${email}?${params.join("&")}` : `mailto:${email}`;
}

// Grab the buyer's likely first name from the full name field
export function firstName(fullName: string | null | undefined): string {
  if (!fullName) return "there";
  const trimmed = String(fullName).trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}
