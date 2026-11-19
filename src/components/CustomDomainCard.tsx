"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Globe, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { checkCustomDomain } from "@/lib/customDomain";

interface DomainView {
  hostname: string;
  status: "pending" | "configuration_needed" | "verifying" | "connected" | "error" | "removing" | "removed";
  statusLabel: string;
  records: Array<{ type: string; name: string; value: string; reason?: string }>;
  error: string | null;
  lastCheckedAt: string | null;
  connectedAt: string | null;
}

const STATUS_STYLE: Record<DomainView["status"], string> = {
  pending: "bg-gray-100 text-gray-700",
  configuration_needed: "bg-amber-100 text-amber-800",
  verifying: "bg-amber-100 text-amber-800",
  connected: "bg-emerald-100 text-emerald-800",
  error: "bg-red-100 text-red-700",
  removing: "bg-gray-100 text-gray-700",
  removed: "bg-gray-100 text-gray-700",
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          window.prompt("Copy this value:", value);
        }
      }}
      aria-label={`Copy ${label}`}
      className="inline-flex items-center gap-1 rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50"
    >
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {done ? "Copied" : "Copy"}
    </button>
  );
}

// Custom domain for the agent's site (their listing collection page and listing pages).
// Shows the live connect flow only when the server reports the feature is configured; otherwise it
// explains that it isn't available yet and offers a format check that saves nothing.
export default function CustomDomainCard({ handle }: { handle: string }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [domain, setDomain] = useState<DomainView | null>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState<"" | "connect" | "check" | "remove">("");
  const [error, setError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/domains");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Couldn't load your domain.");
      setAvailable(json.available === true);
      setDomain(json.domain || null);
    } catch (e) {
      setAvailable(false);
      setError(e instanceof Error ? e.message : "Couldn't load your domain.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const call = async (kind: "connect" | "check" | "remove") => {
    setBusy(kind);
    setError("");
    try {
      const res = await fetch("/api/domains", {
        method: kind === "connect" ? "POST" : kind === "check" ? "PATCH" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: kind === "connect" ? JSON.stringify({ hostname: value }) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      setDomain(json.domain || null);
      if (kind === "remove") setConfirmRemove(false);
      if (kind === "connect") setValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      if (kind === "remove") load();
    } finally {
      setBusy("");
    }
  };

  const check = value.trim() ? checkCustomDomain(value) : null;
  const subdomain = handle ? `${handle}.listingflare.com` : "yourhandle.listingflare.com";

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6" aria-labelledby="custom-domain-heading">
      <div className="flex items-start gap-3">
        <Globe className="mt-1 h-5 w-5 flex-none text-gray-400" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="custom-domain-heading" className="font-serif text-lg font-semibold text-gray-900">Custom domain</h2>
            {available === false && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">Not available yet</span>}
          </div>

          {available === null && <p className="mt-2 flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>}

          {available === false && (
            <p className="mt-1 text-sm text-gray-500">
              Connecting your own domain (like homes.yourname.com) isn&apos;t available yet. Today your agent page is at{" "}
              <strong>{subdomain}</strong>
              {handle ? "" : " once you pick a handle above"}, and each listing has its own listingflare.com link.
            </p>
          )}

          {available === true && (
            <p className="mt-1 text-sm text-gray-500">
              Show your listing collection and listing pages on a domain you own. You keep the domain at your registrar;
              you only add the DNS records shown here. Your {subdomain} address and listingflare.com links keep working.
            </p>
          )}

          {available === true && domain && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-gray-900">{domain.hostname}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[domain.status]}`}>{domain.statusLabel}</span>
              </div>

              {domain.status === "connected" && (
                <p className="text-sm text-gray-700">
                  The hosting provider reports this domain verified and pointing at ListingFlare. Visit{" "}
                  <a href={`https://${domain.hostname}`} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline">https://{domain.hostname}</a>{" "}
                  to check it. The secure (https) certificate is issued by the hosting provider and can take a little longer than DNS.
                </p>
              )}
              {(domain.status === "configuration_needed" || domain.status === "verifying") && (
                <div className="text-sm text-gray-700">
                  <p>
                    At your domain registrar (where you bought the domain), add {domain.records.length === 1 ? "this record" : "these records"},
                    then click <strong>Check again</strong>. DNS changes often take minutes but can take up to 48 hours.
                  </p>
                  {domain.records.length > 0 ? (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full min-w-[28rem] text-left text-xs">
                        <thead className="text-gray-500"><tr><th className="py-1 pr-3 font-medium">Type</th><th className="py-1 pr-3 font-medium">Name / Host</th><th className="py-1 font-medium">Value</th></tr></thead>
                        <tbody>
                          {domain.records.map((r) => (
                            <tr key={`${r.type}-${r.name}-${r.value}`} className="border-t border-gray-100 align-top">
                              <td className="py-1.5 pr-3 font-mono">{r.type}</td>
                              <td className="py-1.5 pr-3"><span className="font-mono break-all">{r.name}</span> <CopyButton value={r.name} label={`${r.type} name`} /></td>
                              <td className="py-1.5"><span className="font-mono break-all">{r.value}</span> <CopyButton value={r.value} label={`${r.type} value`} />{r.reason && <p className="mt-0.5 text-gray-500">{r.reason}</p>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">The hosting provider didn&apos;t return records yet. Click Check again in a minute.</p>
                  )}
                </div>
              )}
              {domain.error && <p className="text-sm text-red-600">{domain.error}</p>}
              {domain.status === "removing" && <p className="text-sm text-gray-700">This domain no longer shows your site. Click Remove again to finish the clean-up.</p>}

              <div className="flex flex-wrap gap-2">
                {domain.status !== "removing" && (
                  <button type="button" onClick={() => call("check")} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    {busy === "check" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Check again
                  </button>
                )}
                {!confirmRemove ? (
                  <button type="button" onClick={() => setConfirmRemove(true)} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                ) : (
                  <span className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-gray-700">Stop showing your site on {domain.hostname}?</span>
                    <button type="button" onClick={() => call("remove")} disabled={!!busy} className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-50">
                      {busy === "remove" ? "Removing…" : "Yes, remove"}
                    </button>
                    <button type="button" onClick={() => setConfirmRemove(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-700">Cancel</button>
                  </span>
                )}
              </div>
              {domain.lastCheckedAt && <p className="text-[11px] text-gray-500">Last checked {new Date(domain.lastCheckedAt).toLocaleString("en-US")}</p>}
            </div>
          )}

          {(available === false || (available === true && !domain)) && (
            <div className="mt-4">
              <label htmlFor="custom-domain-check" className="mb-1.5 block text-sm font-medium text-gray-700">
                {available ? "Domain or subdomain you own" : "Check a domain you own"}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="custom-domain-check"
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  value={value}
                  onChange={(e) => setValue(e.target.value.slice(0, 260))}
                  onKeyDown={(e) => {
                    // This card sits inside the Settings form: Enter must not submit the profile.
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (available && check?.ok && !busy) call("connect");
                    }
                  }}
                  placeholder="homes.yourname.com"
                  aria-describedby="custom-domain-help"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
                {available && (
                  <button type="button" onClick={() => call("connect")} disabled={!check?.ok || !!busy} className="inline-flex flex-none items-center justify-center gap-1.5 rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
                    {busy === "connect" && <Loader2 className="h-4 w-4 animate-spin" />} Connect domain
                  </button>
                )}
              </div>
              <p id="custom-domain-help" className="mt-1.5 min-h-[18px] text-xs" aria-live="polite">
                {check?.ok === true && (
                  <span className="text-emerald-700">
                    {check.domain} looks valid ({check.kind === "subdomain" ? "a subdomain, the easiest type to connect" : "a root domain"}).
                    {available ? "" : " Nothing has been saved or connected."}
                    {value.includes("/") ? ` Only the hostname ${check.domain} is used; paths are ignored.` : ""}
                  </span>
                )}
                {check?.ok === false && <span className="text-amber-700">{check.reason}</span>}
                {!check && available && <span className="text-gray-500">Enter just the hostname, without https:// or a path. A subdomain such as homes.yourname.com is easiest.</span>}
              </p>
            </div>
          )}
          {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </section>
  );
}
