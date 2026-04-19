"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, Calendar, Trophy } from "lucide-react";

// Small marketing animation for the homepage. Shows a single lead card
// auto-advancing through the pipeline stages every ~3 seconds, with the
// status pill changing color each time. Loops forever. No interaction -
// visitors just watch it happen. Demonstrates the drag-and-drop pipeline
// feature without needing a live dashboard.

const STAGES = [
  { id: "new", label: "New Lead", color: "#3b82f6", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500", icon: Mail },
  { id: "contacted", label: "Contacted", color: "#a855f7", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-500", icon: Phone },
  { id: "showing", label: "Showing Booked", color: "#f97316", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500", icon: Calendar },
  { id: "closed", label: "Closed", color: "#10b981", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", icon: Trophy },
];

export default function PipelineAnimation() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStageIndex((i) => (i + 1) % STAGES.length);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const currentStage = STAGES[stageIndex];
  const StageIcon = currentStage.icon;

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-500">
            Your Pipeline
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
            Every lead, tracked from first click to closing day.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-500">
            Watch a buyer move through the pipeline in real time. Drag-and-drop when you want control. Auto-updates when a showing is booked or a deal closes.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-4 shadow-sm md:p-8">
          {/* Kanban columns */}
          <div className="grid grid-cols-4 gap-2 md:gap-4">
            {STAGES.map((stage, idx) => (
              <div key={stage.id} className="flex min-h-[180px] flex-col md:min-h-[220px]">
                <div className="mb-3 flex items-center justify-between gap-1 px-1 md:gap-2">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full md:h-2 md:w-2 ${stage.dot}`} />
                    <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-gray-500 md:text-xs">
                      {stage.label}
                    </span>
                  </div>
                  <span className="flex-shrink-0 text-[10px] font-bold text-gray-400 md:text-xs">
                    {idx === stageIndex ? "1" : "0"}
                  </span>
                </div>
                <div className="relative flex-1 rounded-lg bg-gray-100/60 p-2 md:p-3">
                  <AnimatePresence mode="popLayout">
                    {idx === stageIndex && (
                      <motion.div
                        key={`card-${stage.id}`}
                        layoutId="pipeline-card"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{
                          layout: { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
                          opacity: { duration: 0.3 },
                          scale: { duration: 0.3 },
                        }}
                        className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm md:p-3"
                      >
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-full ${stage.bg} ${stage.text} md:h-7 md:w-7`}
                          >
                            <StageIcon className="h-3 w-3 md:h-3.5 md:w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-semibold text-gray-900 md:text-sm">
                              Sarah Morgan
                            </p>
                            <p className="truncate text-[9px] text-gray-500 md:text-xs">
                              521 Oak Lane
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 hidden md:block">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${stage.bg} ${stage.text} ${stage.border}`}
                          >
                            {stage.label}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>

          {/* Status strip under the kanban */}
          <div className="mt-6 flex items-center justify-center gap-3 text-xs text-gray-500 md:text-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: currentStage.color }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: currentStage.color }} />
            </span>
            <span className="font-medium">
              Sarah just moved to <span style={{ color: currentStage.color }}>{currentStage.label}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
