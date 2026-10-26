"use client";

import { useEffect, useRef, useState } from "react";

// Starts downloading the video only when it is about to scroll into view.
// A video lower on the page used to download at page load, which competed with the
// headline and hero for bandwidth on phones and pulled in third-party cookies.
export default function LazyVideo({
  src,
  poster,
  className,
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setLoad(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      poster={poster}
      className={className}
      src={load ? src : undefined}
    />
  );
}
