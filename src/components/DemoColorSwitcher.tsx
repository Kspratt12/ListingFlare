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
  const [expanded, setExpanded] = useState(false); // start collapsed; rainbow pulse draws attention until clicked
  // The "Demo only" pill appears briefly for reassurance, then fades so
  // the icon can live quietly in the corner without a permanent badge.
  const [showDemoBadge, setShowDemoBadge] = useState(true);

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

  // No scroll auto-collapse — the agent explicitly wants the picker to
  // stay where they left it as they scroll the listing. The Palette
  // toggle button is always the way in or out.

  // Auto-fade the "Demo only" pill after 5 seconds. The palette icon +
  // rainbow pulse stay so visitors can still discover the feature.
  useEffect(() => {
    const t = setTimeout(() => setShowDemoBadge(false), 5000);
    return () => clearTimeout(t);
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
        .demo-palette-pulse { animation: rainbowPulse 2.8s ease-in-out 4; }
      `}</style>
      <div className="rounded-full border border-white/40 bg-white/60 p-1.5 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label="Toggle color picker (demo only — real listings will not show this)"
            className="demo-palette-pulse flex h-8 w-8 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-white/60"
            title="Demo only — your real listings will not show this picker"
          >
            <Palette className="h-4 w-4" />
          </button>
          {/* "Demo only" pill — visible briefly on first load, then fades
              out. The palette icon itself keeps pulsing so visitors can
              still find the color picker; we just don't need the badge
              sitting there permanently once the point is made. */}
          {showDemoBadge && (
            <span
              className="rounded-full bg-gray-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white whitespace-nowrap transition-opacity duration-700"
              style={{ opacity: showDemoBadge ? 1 : 0 }}
            >
              Demo only
            </span>
          )}
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
                    onClick={() => {
                      setActive(c.hex);
                      // Collapse back to the icon after picking so the row
                      // isn't sitting there blocking content.
                      setTimeout(() => setExpanded(false), 350);
                    }}
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
