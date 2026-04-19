"use client";

import { useState } from "react";
import { Play, X } from "lucide-react";

interface Props {
  src: string;
}

export default function VirtualTourEmbed({ src }: Props) {
  const [active, setActive] = useState(false);

  return (
    <section className="relative bg-gray-950">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-400">
            Interactive Experience
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-white md:text-display-sm">
            Walk Through the Home
          </h2>
          <p className="mt-3 text-lg text-gray-400">
            Explore every room in immersive 3D
          </p>
        </div>
      </div>
      <div className="relative w-full" style={{ height: "80vh", minHeight: "500px", maxHeight: "800px" }}>
        <iframe
          src={src}
          title="Virtual Tour"
          className="absolute inset-0 h-full w-full"
          allowFullScreen
        />

        {/* Scroll guard - blocks accidental interaction until user clicks */}
        {!active && (
          <div
            className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-black/30 backdrop-blur-[2px] transition-all hover:bg-black/20"
            onClick={() => setActive(true)}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-500/90 shadow-2xl shadow-brand-500/30 transition-transform hover:scale-110">
                <Play className="h-9 w-9 text-white ml-1" fill="white" />
              </div>
              <p className="rounded-full bg-black/60 px-5 py-2 text-sm font-medium text-white backdrop-blur-sm">
                Click to explore the virtual tour
              </p>
            </div>
          </div>
        )}

        {/* Pause button - centered bottom, lets user deactivate and scroll past */}
        {active && (
          <button
            onClick={() => setActive(false)}
            className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/70 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-black/90 hover:scale-105"
          >
            <X className="h-4 w-4" />
            Pause Tour
          </button>
        )}
      </div>
    </section>
  );
}
