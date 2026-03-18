"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Play } from "lucide-react";

interface Props {
  photos: { src: string; alt: string }[];
  videos?: { src: string; thumbnail?: string; alt: string }[];
}

function VideoCard({ video, index }: { video: { src: string; thumbnail?: string; alt: string }; index: number }) {
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const handleStart = () => {
    setStarted(true);
    setTimeout(() => {
      videoRef.current?.play().catch(() => {});
    }, 100);
  };

  const handleVideoTap = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPaused(false);
    } else {
      videoRef.current.pause();
      setPaused(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
      className="mb-4 break-inside-avoid"
    >
      <div className="group relative overflow-hidden rounded-xl">
        {/* Video preloads hidden behind the thumbnail for instant playback */}
        <div
          className="relative cursor-pointer"
          style={{ aspectRatio: index % 2 === 0 ? "3/4" : "4/5" }}
          onClick={started ? handleVideoTap : handleStart}
        >
          {/* Hidden preloading video */}
          <video
            ref={videoRef}
            src={video.src}
            poster={video.thumbnail}
            playsInline
            muted
            loop
            preload="auto"
            className={`absolute inset-0 h-full w-full rounded-xl object-cover ${started ? "z-10" : "z-0"}`}
          />
          {/* Thumbnail overlay — hides once started */}
          {!started && (
            <div className="absolute inset-0 z-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={video.thumbnail || ""}
                alt={video.alt}
                loading="lazy"
                className="h-full w-full rounded-xl object-cover"
              />
              <div className="absolute inset-0 bg-black/20 rounded-xl" />
              {/* Gold play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/90 shadow-xl shadow-brand-500/30 transition-transform hover:scale-110">
                  <Play className="h-7 w-7 text-white ml-1" fill="white" />
                </div>
              </div>
            </div>
          )}
          {/* Paused indicator */}
          {started && paused && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 rounded-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/90 shadow-xl shadow-brand-500/30">
                <Play className="h-6 w-6 text-white ml-0.5" fill="white" />
              </div>
            </div>
          )}
          {/* 8K badge — always visible */}
          <div className="absolute top-3 left-3 z-30 pointer-events-none">
            <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              8K VIDEO
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function PhotoGallery({ photos, videos = [] }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (i: number) => setLightboxIndex(i);
  const closeLightbox = () => setLightboxIndex(null);
  const nextPhoto = () =>
    setLightboxIndex((i) => (i !== null ? (i + 1) % photos.length : 0));
  const prevPhoto = () =>
    setLightboxIndex((i) =>
      i !== null ? (i - 1 + photos.length) % photos.length : 0
    );

  return (
    <>
      <section id="gallery" className="bg-brand-50 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="mb-14 text-center"
          >
            <h2 className="font-serif text-display-sm font-bold text-gray-900 md:text-display">
              Gallery
            </h2>
            <p className="mt-3 text-lg text-gray-500">
              {photos.length} photo{photos.length !== 1 ? "s" : ""}{videos.length > 0 ? ` & ${videos.length} video${videos.length !== 1 ? "s" : ""}` : ""} showcasing every detail
            </p>
          </motion.div>

          {/* Masonry grid — photos and videos blended together */}
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {/* First few photos */}
            {photos.slice(0, 3).map((photo, i) => (
              <motion.div
                key={`photo-${i}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
                className="mb-4 break-inside-avoid"
              >
                <button
                  onClick={() => openLightbox(i)}
                  className="group relative block w-full overflow-hidden rounded-lg"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    loading="lazy"
                    className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    style={{ aspectRatio: i % 3 === 0 ? "3/4" : i % 3 === 1 ? "4/3" : "1/1" }}
                  />
                  <div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/20" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span className="rounded-full bg-white/90 px-5 py-2 text-sm font-medium text-gray-900">View</span>
                  </div>
                </button>
              </motion.div>
            ))}

            {/* Videos blended into the grid */}
            {videos.map((video, i) => (
              <VideoCard key={`video-${i}`} video={video} index={i} />
            ))}

            {/* Remaining photos */}
            {photos.slice(3).map((photo, i) => (
              <motion.div
                key={`photo-rest-${i}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
                className="mb-4 break-inside-avoid"
              >
                <button
                  onClick={() => openLightbox(i + 3)}
                  className="group relative block w-full overflow-hidden rounded-lg"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    loading="lazy"
                    className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    style={{ aspectRatio: (i + 3) % 3 === 0 ? "3/4" : (i + 3) % 3 === 1 ? "4/3" : "1/1" }}
                  />
                  <div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/20" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span className="rounded-full bg-white/90 px-5 py-2 text-sm font-medium text-gray-900">View</span>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
            onClick={closeLightbox}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute right-6 top-6 z-50 rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20"
              aria-label="Close lightbox"
            >
              <X className="h-6 w-6 text-white" />
            </button>

            {/* Nav */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevPhoto();
              }}
              className="absolute left-4 z-50 rounded-full bg-white/10 p-3 transition-colors hover:bg-white/20 md:left-8"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextPhoto();
              }}
              className="absolute right-4 z-50 rounded-full bg-white/10 p-3 transition-colors hover:bg-white/20 md:right-8"
              aria-label="Next photo"
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>

            {/* Image */}
            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[85vh] max-w-[90vw]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[lightboxIndex].src}
                alt={photos[lightboxIndex].alt}
                className="max-h-[85vh] rounded-lg object-contain"
              />
              <p className="mt-4 text-center text-sm text-white/60">
                {photos[lightboxIndex].alt} &mdash; {lightboxIndex + 1} of{" "}
                {photos.length}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
