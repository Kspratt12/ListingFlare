"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Quote, Star } from "lucide-react";

interface Props {
  agentId: string;
}

interface Testimonial {
  id: string;
  author_name: string | null;
  rating: number | null;
  quote: string;
  submitted_at: string;
}

// Auto-displays the agent's approved testimonials on every listing page.
// Next buyer on a different listing sees social proof from previous sellers.
// Trust compounds. Fetches only approved (public consent) + submitted
// testimonials. Hides if the agent has none yet.
export default function TestimonialShowcase({ agentId }: Props) {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("testimonials")
          .select("id, author_name, rating, quote, submitted_at")
          .eq("agent_id", agentId)
          .eq("approved", true)
          .not("submitted_at", "is", null)
          .order("submitted_at", { ascending: false })
          .limit(3);
        if (active) {
          setItems((data as Testimonial[]) || []);
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
  }, [agentId]);

  if (!loaded || items.length === 0) return null;

  return (
    <section className="bg-gray-50 py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            From past clients
          </p>
          <h2 className="mt-2 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
            What sellers are saying
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {items.map((t) => (
            <figure
              key={t.id}
              className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <Quote className="h-5 w-5 flex-shrink-0 text-brand-400" />
              {t.rating && (
                <div className="mt-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < (t.rating || 0) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                    />
                  ))}
                </div>
              )}
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-gray-700 md:text-base">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-4 border-t border-gray-100 pt-4 text-xs font-semibold text-gray-900">
                {t.author_name || "Anonymous"}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
