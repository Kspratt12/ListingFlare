"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead } from "@/lib/types";
import { StickyNote, Tag, Check, Loader2 } from "lucide-react";

interface Props {
  lead: Lead;
  onUpdate: (updates: Partial<Lead>) => void;
}

const AVAILABLE_TAGS = [
  { value: "serious_buyer", label: "Serious Buyer", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "pre_approved", label: "Pre-Approved", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "first_time", label: "First-Time Buyer", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "investor", label: "Investor", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "vip", label: "VIP", color: "bg-pink-50 text-pink-700 border-pink-200" },
  { value: "follow_up", label: "Needs Follow-Up", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "cold", label: "Cold", color: "bg-gray-50 text-gray-600 border-gray-200" },
];

export function getTagStyle(tag: string) {
  return AVAILABLE_TAGS.find((t) => t.value === tag)?.color || "bg-gray-50 text-gray-600 border-gray-200";
}

export function getTagLabel(tag: string) {
  return AVAILABLE_TAGS.find((t) => t.value === tag)?.label || tag;
}

export default function LeadNotesTags({ lead, onUpdate }: Props) {
  const [notes, setNotes] = useState(lead.notes || "");
  const [tags, setTags] = useState<string[]>(lead.tags || []);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Reset local state when a different lead is selected
  useEffect(() => {
    setNotes(lead.notes || "");
    setTags(lead.tags || []);
    setSavedAt(null);
  }, [lead.id, lead.notes, lead.tags]);

  // Auto-save notes after 800ms of idle
  useEffect(() => {
    if (notes === (lead.notes || "")) return;
    const timer = setTimeout(async () => {
      setSaving(true);
      const supabase = createClient();
      const { error } = await supabase
        .from("leads")
        .update({ notes })
        .eq("id", lead.id);
      setSaving(false);
      if (!error) {
        onUpdate({ notes });
        setSavedAt(Date.now());
      }
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, lead.id]);

  const toggleTag = async (tag: string) => {
    const newTags = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    setTags(newTags);
    const supabase = createClient();
    await supabase.from("leads").update({ tags: newTags }).eq("id", lead.id);
    onUpdate({ tags: newTags });
    setSavedAt(Date.now());
  };

  const showSaved = savedAt && Date.now() - savedAt < 2000;

  return (
    <div className="space-y-3">
      {/* Tags */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          <Tag className="h-3 w-3" />
          Tags
        </div>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_TAGS.map((t) => {
            const active = tags.includes(t.value);
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleTag(t.value)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                  active
                    ? t.color
                    : "border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600"
                }`}
              >
                {active && <Check className="h-2.5 w-2.5" />}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          <div className="flex items-center gap-1.5">
            <StickyNote className="h-3 w-3" />
            Private Notes
          </div>
          {saving ? (
            <span className="flex items-center gap-1 text-[10px] font-normal normal-case tracking-normal text-gray-400">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              Saving…
            </span>
          ) : showSaved ? (
            <span className="flex items-center gap-1 text-[10px] font-normal normal-case tracking-normal text-emerald-600">
              <Check className="h-2.5 w-2.5" />
              Saved
            </span>
          ) : null}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Pre-approved for $450k. Wife's name is Sarah. Likes mid-century modern. Call Tuesday AM."
          maxLength={800}
          className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-400"
        />
        <p className="mt-1 text-[10px] text-gray-400">
          Notes are private to you. Not sent to leads.
        </p>
      </div>
    </div>
  );
}
