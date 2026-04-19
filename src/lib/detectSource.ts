// Detect visitor source for lead attribution.
// Priority: ?src= override > ?utm_source= > document.referrer hostname > "direct"
export function detectSource(): string {
  if (typeof window === "undefined") return "direct";

  const params = new URLSearchParams(window.location.search);
  const srcParam = params.get("src") || params.get("utm_source");
  if (srcParam) return srcParam.toLowerCase().slice(0, 32);

  const ref = document.referrer;
  if (!ref) return "direct";
  try {
    const host = new URL(ref).hostname.toLowerCase();
    if (host.includes("instagram")) return "instagram";
    if (host.includes("facebook") || host.includes("fb.com")) return "facebook";
    if (host.includes("zillow")) return "zillow";
    if (host.includes("realtor")) return "realtor";
    if (host.includes("google")) return "google";
    if (host.includes("tiktok")) return "tiktok";
    if (host.includes("linkedin")) return "linkedin";
    if (host.includes("twitter") || host.includes("x.com")) return "twitter";
    if (host.includes("listingflare")) return "direct";
    return host.replace(/^www\./, "").split(".")[0].slice(0, 32);
  } catch {
    return "direct";
  }
}
