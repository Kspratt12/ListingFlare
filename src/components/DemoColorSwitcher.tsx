"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";

const COLORS = [
  { hex: "#b8965a", label: "Gold" },
  { hex: "#0f172a", label: "Navy" },
  { hex: "#0ea5e9", label: "Sky" },
  { hex: "#10b981", label: "Emerald" },
  { hex: "#ef4444", label: "Red" },
  { hex: "#f59e0b", label: "Amber" },
  { hex: "#8b5cf6", label: "Purple" },
  { hex: "#ec4899", label: "Pink" },
];

// Floating color picker only rendered on the demo page. Lets a prospect
// see how any brand color would look on their listing. Updates the
// --agent-brand CSS variable at runtime so every tinted element on the
// page swaps color instantly. This is what makes them realize: "oh,
// MY color can be on MY listings."
export default function DemoColorSwitcher({ topOffset = false }: { topOffset?: boolean }) {
  const [active, setActive] = useState(COLORS[0].hex);
  const [expanded, setExpanded] = useState(true); // start expanded so swatches are immediately visible

  useEffect(() => {
    document.documentElement.style.setProperty("--agent-brand", active);
  }, [active]);

  // On unmount (visitor navigates away from /demo), clear the CSS
  // variable so the demo color choice can't bleed into the dashboard,
  // other agents' listings, or any other page. Each page that cares
  // about the brand color sets its own value on mount.
  useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty("--agent-brand");
    };
  }, []);

  // Auto-collapse when the user starts scrolling so the swatches don't
  // compete with content. They can click the palette icon to re-expand.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) > 40) {
        setExpanded(false);
      }
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed left-4 z-30 transition-all sm:left-6 ${
        topOffset ? "top-28" : "top-24"
      }`}
    >
      <style>{`
        @keyframes rainbowPulse {
          0%   { box-shadow: 0 0 0 0 rgba(184, 150, 90, 0.7); }
          15%  { box-shadow: 0 0 0 10px rgba(139, 92, 246, 0); }
          30%  { box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.7); }
          45%  { box-shadow: 0 0 0 10px rgba(14, 165, 233, 0); }
          60%  { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          75%  { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
          90%  { box-shadow: 0 0 0 0 rgba(184, 150, 90, 0.6); }
          100% { box-shadow: 0 0 0 0 rgba(184, 150, 90, 0); }
        }
        .demo-palette-pulse { animation: rainbowPulse 2.5s ease-in-out 2; }
      `}</style>
      <div className="rounded-full border border-white/40 bg-white/60 p-1.5 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label="Toggle color picker"
            className="demo-palette-pulse flex h-8 w-8 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-white/60"
            title={expanded ? "Hide colors" : "Try a color"}
          >
            <Palette className="h-4 w-4" />
          </button>
          {expanded && (
            <>
              <span className="hidden pr-1 text-[11px] font-medium text-gray-700 sm:inline">
                Try it:
              </span>
              <div className="flex items-center gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setActive(c.hex)}
                    aria-label={c.label}
                    title={c.label}
                    style={{ backgroundColor: c.hex }}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                      active.toLowerCase() === c.hex.toLowerCase()
                        ? "border-white ring-2 ring-gray-900 ring-offset-1"
                        : "border-white"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
