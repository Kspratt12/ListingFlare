"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Play, Maximize2, Minimize2 } from "lucide-react";

interface Props {
  photos: { src: string; alt: string }[];
  videos?: { src: string; thumbnail?: string; alt: string }[];
}

function VideoCard({ video, index }: { video: { src: string; thumbnail?: string; alt: string }; index: number }) {
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
      className={`mb-4 break-inside-avoid ${expanded ? "fixed inset-4 z-50 flex items-center justify-center" : ""}`}
    >
      {expanded && <div className="absolute inset-0 bg-black/90 -z-10" onClick={() => { setExpanded(false); if (videoRef.current) { videoRef.current.pause(); setPlaying(false); } }} />}
      <div className={`group relative overflow-hidden rounded-xl ${expanded ? "max-w-4xl w-full" : ""}`}>
        <video
          ref={videoRef}
          src={video.src}
          poster={video.thumbnail}
          preload="metadata"
          playsInline
          className={`w-full object-cover ${expanded ? "max-h-[80vh] object-contain" : ""}`}
          style={!expanded ? { aspectRatio: index % 2 === 0 ? "3/4" : "4/5" } : undefined}
          onEnded={() => setPlaying(false)}
          onClick={togglePlay}
        />
        {/* Gold play button overlay */}
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer" onClick={togglePlay}>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/90 shadow-xl shadow-brand-500/30 transition-transform hover:scale-110">
              <Play className="h-7 w-7 text-white ml-1" fill="white" />
            </div>
          </div>
        )}
        {/* Controls */}
        <div className={`absolute bottom-3 right-3 flex gap-2 ${playing ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="rounded-full bg-black/50 p-2 text-white backdrop-blur-sm hover:bg-black/70"
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
        {/* 8K badge */}
        <div className="absolute top-3 left-3">
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            8K VIDEO
          </span>
        </div>
        {/* Caption */}
        {!expanded && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-10">
            <p className="text-sm font-medium text-white">{video.alt}</p>
          </div>
        )}
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
