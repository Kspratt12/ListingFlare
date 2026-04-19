"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Share2, Copy, Check, Mail, Loader2, Trash2, Eye } from "lucide-react";

interface Props {
  listingId: string;
}

interface PortalState {
  id: string;
  access_token: string;
  seller_name: string | null;
  seller_email: string | null;
  visit_count: number;
  last_visited_at: string | null;
}

export default function SellerPortalCard({ listingId }: Props) {
  const [portal, setPortal] = useState<PortalState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sellerName, setSellerName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("seller_portals")
        .select("id, access_token, seller_name, seller_email, visit_count, last_visited_at")
        .eq("listing_id", listingId)
        .eq("active", true)
        .maybeSingle();
      if (active) {
        setPortal((data as PortalState) || null);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [listingId]);

  const portalUrl = portal
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/seller/${portal.access_token}`
    : "";

  const createPortal = async (sendInvite: boolean) => {
    setBusy(true);
    try {
      const res = await fetch("/api/seller-portal/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          sellerName: sellerName || undefined,
          sellerEmail: sendInvite ? sellerEmail || undefined : undefined,
          sendInvite,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast(data.error || "Failed to create portal");
      } else {
        // Refetch to get the fresh record
        const supabase = createClient();
        const { data: fresh } = await supabase
          .from("seller_portals")
          .select("id, access_token, seller_name, seller_email, visit_count, last_visited_at")
          .eq("listing_id", listingId)
          .eq("active", true)
          .maybeSingle();
        setPortal(fresh as PortalState);
        setShowInvite(false);
        setToast(sendInvite ? "Invite sent to your seller." : "Seller portal created.");
      }
    } catch {
      setToast("Something went wrong. Try again.");
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const copyLink = async () => {
    if (!portalUrl) return;
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast("Couldn't copy. Select the link manually.");
    }
  };

  const revoke = async () => {
    if (!portal) return;
    if (!confirm("Revoke this seller portal? The seller's link will stop working.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/seller-portal/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalId: portal.id }),
      });
      if (res.ok) {
        setPortal(null);
        setToast("Portal revoked.");
      }
    } catch {
      setToast("Failed to revoke.");
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-gray-400" />
          <h2 className="font-serif text-lg font-semibold text-gray-900">Seller Portal</h2>
        </div>
        <div className="mt-4 h-16 animate-pulse rounded-lg bg-gray-100" />
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50/50 via-white to-amber-50/40 p-6">
      {toast && (
        <div className="absolute right-4 top-4 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm">
          {toast}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Share2 className="h-4 w-4 text-brand-600" />
        <h2 className="font-serif text-lg font-semibold text-gray-900">Seller Portal</h2>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Give your seller a private real-time dashboard. They see views, inquiries, and scheduled showings as they happen. Agents who share this close more listings AND get more referrals.
      </p>

      {!portal ? (
        <div className="mt-5 space-y-3">
          {!showInvite ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                Invite your seller
              </button>
              <button
                type="button"
                onClick={() => createPortal(false)}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                Just create a link
              </button>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Seller&apos;s name</label>
                  <input
                    type="text"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    placeholder="e.g. Sarah"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Seller&apos;s email *</label>
                  <input
                    type="email"
                    value={sellerEmail}
                    onChange={(e) => setSellerEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => createPortal(true)}
                  disabled={busy || !sellerEmail}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Send invite
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  disabled={busy}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {portal.seller_email && (
            <p className="text-xs text-gray-600">
              Active for <span className="font-semibold text-gray-900">{portal.seller_name || portal.seller_email}</span>
              {portal.last_visited_at && (
                <span className="ml-2 text-gray-500">
                  · Last visited {new Date(portal.last_visited_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {portal.visit_count > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-gray-500">
                  <Eye className="h-3 w-3" />
                  {portal.visit_count} {portal.visit_count === 1 ? "visit" : "visits"}
                </span>
              )}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={portalUrl}
              readOnly
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 min-w-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:outline-none"
            />
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-gray-800"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Eye className="h-3 w-3" />
              Preview as seller
            </a>
            <button
              type="button"
              onClick={() => setShowInvite(!showInvite)}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Mail className="h-3 w-3" />
              Re-send invite
            </button>
            <button
              type="button"
              onClick={revoke}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              Revoke
            </button>
          </div>
          {showInvite && portal && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Seller&apos;s name</label>
                  <input
                    type="text"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    placeholder={portal.seller_name || "e.g. Sarah"}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Seller&apos;s email *</label>
                  <input
                    type="email"
                    value={sellerEmail}
                    onChange={(e) => setSellerEmail(e.target.value)}
                    placeholder={portal.seller_email || "sarah@example.com"}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => createPortal(true)}
                  disabled={busy || !sellerEmail}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Send
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
