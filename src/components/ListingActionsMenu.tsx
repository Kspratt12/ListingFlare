"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { Listing } from "@/lib/types";
import {
  MoreHorizontal,
  FileText,
  Link2,
  QrCode,
  Copy,
  Archive,
  Trash2,
  Share2,
  Lock,
  Check,
  Loader2,
  Presentation,
} from "lucide-react";

interface Props {
  listing: Listing;
  canGenerateSocialPosts: boolean;
  copiedId: string | null;
  generatingQR: string | null;
  duplicating: string | null;
  generatingPosts: string | null;
  onCopyLink: (e: React.MouseEvent, listing: Listing) => void;
  onDownloadQR: (e: React.MouseEvent, listing: Listing) => void;
  onDuplicate: (e: React.MouseEvent, listing: Listing) => void;
  onGenerateSocialPosts: (e: React.MouseEvent, listingId: string) => void;
  onArchive: (e: React.MouseEvent, listingId: string) => void;
  onDelete: (e: React.MouseEvent, listingId: string) => void;
}

export default function ListingActionsMenu({
  listing,
  canGenerateSocialPosts,
  copiedId,
  generatingQR,
  duplicating,
  generatingPosts,
  onCopyLink,
  onDownloadQR,
  onDuplicate,
  onGenerateSocialPosts,
  onArchive,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isPublic = listing.status !== "archived" && listing.status !== "draft";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label="More actions"
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-full right-0 z-20 mb-1 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          <div className="py-1">
            {isPublic && (
              <>
                <Link
                  href={`/dashboard/presentation/${listing.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700"
                >
                  <Presentation className="h-4 w-4 text-brand-500" />
                  AI Listing Presentation
                </Link>
                <Link
                  href={`/reports/${listing.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <FileText className="h-4 w-4 text-indigo-500" />
                  Seller Report
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    onCopyLink(e, listing);
                    setTimeout(() => setOpen(false), 800);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700"
                >
                  {copiedId === listing.id ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 text-brand-500" />
                      Copy Listing URL
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    onDownloadQR(e, listing);
                    setTimeout(() => setOpen(false), 800);
                  }}
                  disabled={generatingQR === listing.id}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  {generatingQR === listing.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  ) : (
                    <QrCode className="h-4 w-4 text-gray-600" />
                  )}
                  Download QR Code
                </button>
              </>
            )}

            {listing.status === "published" &&
              listing.photos.length > 0 &&
              (canGenerateSocialPosts ? (
                <button
                  type="button"
                  onClick={(e) => {
                    onGenerateSocialPosts(e, listing.id);
                    setOpen(false);
                  }}
                  disabled={generatingPosts === listing.id}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-50"
                >
                  {generatingPosts === listing.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                  ) : (
                    <Share2 className="h-4 w-4 text-purple-500" />
                  )}
                  Social Media Pack
                </button>
              ) : (
                <Link
                  href="/dashboard/billing"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 hover:bg-gray-50"
                >
                  <Lock className="h-4 w-4" />
                  Social Posts (Upgrade)
                </Link>
              ))}

            <button
              type="button"
              onClick={(e) => {
                onDuplicate(e, listing);
                setOpen(false);
              }}
              disabled={duplicating === listing.id}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
            >
              {duplicating === listing.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              ) : (
                <Copy className="h-4 w-4 text-blue-500" />
              )}
              Duplicate
            </button>

            {listing.status !== "archived" && (
              <button
                type="button"
                onClick={(e) => {
                  onArchive(e, listing.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700"
              >
                <Archive className="h-4 w-4 text-amber-500" />
                Archive
              </button>
            )}

            <div className="my-1 border-t border-gray-100" />

            <button
              type="button"
              onClick={(e) => {
                onDelete(e, listing.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
