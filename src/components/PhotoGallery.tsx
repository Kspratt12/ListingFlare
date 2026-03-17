"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  photos: { src: string; alt: string }[];
  videos?: { src: string; thumbnail?: string; alt: string }[];
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

          {/* Masonry-style grid */}
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {photos.map((photo, i) => (
              <motion.div
                key={i}
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
                    style={{
                      aspectRatio: i % 3 === 0 ? "3/4" : i % 3 === 1 ? "4/3" : "1/1",
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/20" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span className="rounded-full bg-white/90 px-5 py-2 text-sm font-medium text-gray-900">
                      View
                    </span>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>

          {/* Videos */}
          {videos.length > 0 && (
            <div className="mt-14">
              <h3 className="mb-8 text-center font-serif text-2xl font-bold text-gray-900">
                Property Videos
              </h3>
              <div className="grid gap-6 sm:grid-cols-2">
                {videos.map((video, i) => (
                  <motion.div
                    key={`video-${i}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="overflow-hidden rounded-xl bg-black shadow-lg"
                  >
                    <video
                      src={video.src}
                      controls
                      preload="metadata"
                      className="aspect-video w-full object-contain"
                      playsInline
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
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
