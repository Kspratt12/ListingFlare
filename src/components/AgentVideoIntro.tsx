"use client";

import { Play } from "lucide-react";
import { useState } from "react";

interface Props {
  videoUrl: string;
  agentName: string;
  agentHeadshot?: string | null;
  listingAddress: string;
}

// Small personal-touch section above the photo gallery. Shows a video
// placeholder with agent's headshot; click to play. Renders either a
// direct <video> embed or a YouTube/Vimeo iframe based on URL shape.
export default function AgentVideoIntro({
  videoUrl,
  agentName,
  agentHeadshot,
  listingAddress,
}: Props) {
  const [playing, setPlaying] = useState(false);

  if (!videoUrl) return null;

  const isYouTube = /youtu\.be|youtube\.com/.test(videoUrl);
  const isVimeo = /vimeo\.com/.test(videoUrl);
  const isDirectVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(videoUrl);

  // Convert YouTube or Vimeo URLs into embed URLs
  let embedUrl = videoUrl;
  if (isYouTube) {
    const idMatch = videoUrl.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]+)/);
    if (idMatch) embedUrl = `https://www.youtube.com/embed/${idMatch[1]}?autoplay=1`;
  } else if (isVimeo) {
    const idMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
    if (idMatch) embedUrl = `https://player.vimeo.com/video/${idMatch[1]}?autoplay=1`;
  }

  const firstName = agentName?.split(" ")[0] || "your agent";

  return (
    <section className="bg-white py-14 md:py-16">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            A Quick Welcome
          </p>
          <h2 className="mt-2 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
            {firstName} has a note for you
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            A personal walkthrough of {listingAddress}.
          </p>
        </div>

        <div className="relative mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-gray-900 shadow-xl">
          <div className="relative aspect-video w-full">
            {playing ? (
              isDirectVideo ? (
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="absolute inset-0 h-full w-full bg-black object-contain"
                />
              ) : (
                <iframe
                  src={embedUrl}
                  title={`Video intro from ${agentName}`}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              )
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                aria-label="Play video intro"
                className="group absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 transition-opacity"
              >
                {agentHeadshot && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={agentHeadshot}
                    alt={agentName}
                    className="absolute inset-0 h-full w-full object-cover opacity-60 transition-opacity group-hover:opacity-40"
                  />
                )}
                <div className="relative flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 shadow-2xl transition-transform group-hover:scale-110">
                    <Play className="h-7 w-7 translate-x-0.5 text-white" fill="white" />
                  </div>
                  <p className="font-serif text-sm font-semibold text-white/90">Play intro from {firstName}</p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
