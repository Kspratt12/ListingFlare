import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS ignores SVG touch icons, so this renders the same "L" mark as a PNG.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a1a2e",
          color: "#b8965a",
          fontSize: 130,
          fontWeight: 700,
          fontStyle: "italic",
          fontFamily: "Georgia, serif",
        }}
      >
        L
      </div>
    ),
    { ...size }
  );
}
