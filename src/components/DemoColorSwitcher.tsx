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
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty("--agent-brand", active);
  }, [active]);

  return (
    <div
      className={`fixed left-4 z-40 transition-all sm:left-6 ${
        topOffset ? "top-24" : "top-20"
      }`}
    >
      <div className="rounded-full border border-gray-200 bg-white/95 p-1.5 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label="Toggle color picker"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100"
            title={expanded ? "Hide colors" : "Try a color"}
          >
            <Palette className="h-4 w-4" />
          </button>
          {expanded && (
            <>
              <span className="hidden pr-1 text-[11px] font-medium text-gray-500 sm:inline">
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
                        ? "border-gray-900 ring-2 ring-gray-900 ring-offset-1"
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
