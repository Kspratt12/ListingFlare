"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { CUSTOM_DOMAINS_AVAILABLE, checkCustomDomain } from "@/lib/customDomain";

// Custom domains are NOT available yet (see docs/custom-domains.md). This card says so plainly,
// shows what works today, and lets an agent check that a domain they own is in a usable format.
// It saves nothing and changes no DNS.
export default function CustomDomainCard({ handle }: { handle: string }) {
  const [value, setValue] = useState("");
  const check = value.trim() ? checkCustomDomain(value) : null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <Globe className="mt-1 h-5 w-5 flex-none text-gray-400" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-lg font-semibold text-gray-900">Custom domain</h2>
            {!CUSTOM_DOMAINS_AVAILABLE && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">Not available yet</span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Connecting your own domain (like homes.yourname.com) isn&apos;t available yet. Today your agent page is at{" "}
            <strong>{handle ? `${handle}.listingflare.com` : "yourhandle.listingflare.com"}</strong>
            {handle ? "" : " once you pick a handle above"}, and each listing has its own listingflare.com link.
          </p>
          <label htmlFor="custom-domain-check" className="mb-1.5 mt-4 block text-sm font-medium text-gray-700">
            Check a domain you own
          </label>
          <input
            id="custom-domain-check"
            type="text"
            inputMode="url"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, 260))}
            placeholder="homes.yourname.com"
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
          <p className="mt-1.5 min-h-[18px] text-xs" aria-live="polite">
            {check?.ok === true && (
              <span className="text-emerald-700">
                {check.domain} looks valid ({check.kind === "subdomain" ? "a subdomain, the easiest type to connect" : "a root domain"}).
                Nothing has been saved or connected.
              </span>
            )}
            {check?.ok === false && <span className="text-amber-700">{check.reason}</span>}
          </p>
        </div>
      </div>
    </section>
  );
}
