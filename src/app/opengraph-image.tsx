import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "ListingFlare - Real Estate Software for Listing Agents | Property Websites & Lead Capture";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0a0a0a",
          padding: "60px 80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top: Logo */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: "#ffffff" }}>
            Listing
          </span>
          <span style={{ fontSize: 36, fontWeight: 700, color: "#ac9d7e" }}>
            Flare
          </span>
        </div>

        {/* Center: Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Property Websites That
            <br />
            Capture Leads 24/7
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#9ca3af",
              lineHeight: 1.4,
              maxWidth: 700,
            }}
          >
            AI chatbot answers buyer questions, captures contact info, and books
            showings - while you sleep.
          </div>
        </div>

        {/* Bottom: CTA + Stats */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              backgroundColor: "#ac9d7e",
              padding: "14px 32px",
              borderRadius: 999,
              fontSize: 20,
              fontWeight: 600,
              color: "#ffffff",
            }}
          >
            Start Free Trial
          </div>
          <div style={{ display: "flex", gap: 40 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: "#ffffff" }}>
                5 min
              </span>
              <span style={{ fontSize: 14, color: "#6b7280" }}>Setup</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: "#ffffff" }}>
                24/7
              </span>
              <span style={{ fontSize: 14, color: "#6b7280" }}>AI Chat</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: "#ffffff" }}>
                4.9/5
              </span>
              <span style={{ fontSize: 14, color: "#6b7280" }}>Rating</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
