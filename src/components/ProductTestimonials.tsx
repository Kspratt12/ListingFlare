"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Quote, Star } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  agentCount?: number;
}

interface PT {
  id: string;
  author_name: string;
  author_title: string | null;
  author_city: string | null;
  author_photo_url: string | null;
  quote: string;
  rating: number | null;
  featured: boolean;
}

// Renders on the marketing homepage. Pulls approved product
// testimonials from the DB and displays them. Auto-hides entirely
// if there are none yet - no "coming soon" filler. Add rows in the
// Supabase SQL Editor to populate.
export default function ProductTestimonials({ agentCount }: Props) {
  const [items, setItems] = useState<PT[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("product_testimonials")
          .select("id, author_name, author_title, author_city, author_photo_url, quote, rating, featured")
          .eq("approved", true)
          .order("featured", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(6);
        if (active) {
          setItems((data as PT[]) || []);
          setLoaded(true);
        }
      } catch {
        if (active) setLoaded(true);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  // Don't render until loaded to avoid flash-of-empty
  if (!loaded) return null;
  if (items.length === 0) return null;

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-500">
            From agents using it
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
            What agents are saying
          </h2>
          {typeof agentCount === "number" && agentCount > 0 && (
            <p className="mt-3 text-base text-gray-500">
              Trusted by {agentCount.toLocaleString()}+ real estate agents.
            </p>
          )}
        </motion.div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t, i) => (
            <motion.figure
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex flex-col rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/40 p-6 shadow-sm"
            >
              <Quote className="h-6 w-6 flex-shrink-0 text-brand-400" />
              {t.rating && (
                <div className="mt-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`h-4 w-4 ${idx < (t.rating || 0) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                    />
                  ))}
                </div>
              )}
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-gray-700 md:text-base">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-4">
                {t.author_photo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={t.author_photo_url}
                    alt={t.author_name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {t.author_name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.author_name}</p>
                  {(t.author_title || t.author_city) && (
                    <p className="text-xs text-gray-500">
                      {[t.author_title, t.author_city].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
