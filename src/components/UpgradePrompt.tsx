"use client";

import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";

interface Props {
  title?: string;
  message: string;
  compact?: boolean;
}

export default function UpgradePrompt({ title = "Upgrade to Unlock", message, compact = false }: Props) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
        <Lock className="h-3.5 w-3.5 flex-shrink-0 text-brand-500" />
        <p className="text-xs text-brand-700">{message}</p>
        <Link
          href="/dashboard/billing"
          className="ml-auto flex-shrink-0 rounded-full bg-brand-500 px-3 py-1 text-[10px] font-semibold text-white hover:bg-brand-600"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
        <Lock className="h-6 w-6 text-brand-500" />
      </div>
      <h3 className="mt-4 font-serif text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{message}</p>
      <Link
        href="/dashboard/billing"
        className="group mt-4 inline-flex items-center gap-2 rounded-full bg-gray-950 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
      >
        Upgrade Now
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}
