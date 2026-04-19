"use client";

import { useState } from "react";
import { UserPlus, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Lead } from "@/lib/types";

interface Props {
  lead: Lead;
}

// Adds the buyer-side lead as a seller prospect too. Useful when a buyer
// mentions they're also selling their current home - one click saves the
// agent from re-entering all the contact info manually.
export default function ConvertToProspectButton({ lead }: Props) {
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const convert = async () => {
    if (state === "saving" || state === "done") return;
    setState("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/seller-prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          source: "online",
          stage: "prospect",
          notes: `Converted from buyer lead on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.${lead.message ? `\n\nOriginal inquiry: ${lead.message}` : ""}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Couldn't add as prospect");
        setState("error");
        setTimeout(() => setState("idle"), 3000);
        return;
      }
      setState("done");
    } catch {
      setErrorMsg("Something went wrong");
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  if (state === "done") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700">
        <Check className="h-3 w-3" />
        Added to Seller Prospects
        <Link
          href="/dashboard/seller-prospects"
          className="ml-1 underline hover:text-emerald-900"
        >
          View
        </Link>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-700">
        {errorMsg || "Failed"}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={convert}
      disabled={state === "saving"}
      title="If they mentioned they're also selling, track them on both sides."
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
    >
      {state === "saving" ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
      {state === "saving" ? "Adding" : "Also track as seller prospect"}
    </button>
  );
}
