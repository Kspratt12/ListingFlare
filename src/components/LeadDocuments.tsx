"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  X,
  Loader2,
  FileType,
  Image as ImageIcon,
  FileCheck,
} from "lucide-react";

interface Props {
  leadId: string;
}

interface LeadDoc {
  id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  category: string;
  created_at: string;
}

const CATEGORIES: Array<{ value: string; label: string; color: string }> = [
  { value: "all", label: "All", color: "text-gray-700" },
  { value: "contract", label: "Contracts", color: "text-emerald-700" },
  { value: "inspection", label: "Inspection", color: "text-amber-700" },
  { value: "financing", label: "Financing", color: "text-blue-700" },
  { value: "disclosure", label: "Disclosure", color: "text-purple-700" },
  { value: "other", label: "Other", color: "text-gray-600" },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function iconForMime(mime: string | null): typeof FileText {
  if (!mime) return FileText;
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime === "application/pdf") return FileType;
  return FileText;
}

export default function LeadDocuments({ leadId }: Props) {
  const [docs, setDocs] = useState<LeadDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [uploadCategory, setUploadCategory] = useState("other");
  const [preview, setPreview] = useState<{ url: string; name: string; mime: string | null } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/documents?leadId=${encodeURIComponent(leadId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setDocs(data.documents || []);
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const handleFiles = async (files: FileList | File[]) => {
    setError(null);
    const arr = Array.from(files);
    if (arr.length === 0) return;

    setUploading(true);
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        return;
      }

      for (let i = 0; i < arr.length; i++) {
        const file = arr[i];
        if (file.size > 50 * 1024 * 1024) {
          setError(`${file.name} exceeds 50 MB limit`);
          continue;
        }
        if (file.size === 0) {
          setError(`${file.name} is empty`);
          continue;
        }

        setUploadProgress(`Uploading ${file.name}... (${i + 1} of ${arr.length})`);

        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${user.id}/${leadId}/${timestamp}-${safeName}`;

        const { error: uploadErr } = await supabase.storage
          .from("lead-documents")
          .upload(storagePath, file, { upsert: false });

        if (uploadErr) {
          setError(`Couldn't upload ${file.name}: ${uploadErr.message}`);
          continue;
        }

        const saveRes = await fetch("/api/leads/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId,
            storagePath,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || null,
            category: uploadCategory,
          }),
        });

        if (!saveRes.ok) {
          const data = await saveRes.json().catch(() => ({}));
          setError(data.error || `Couldn't save ${file.name}`);
          // Try to clean up orphaned storage file
          await supabase.storage.from("lead-documents").remove([storagePath]);
          continue;
        }
      }

      await loadDocs();
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const openDoc = async (doc: LeadDoc) => {
    try {
      const res = await fetch(`/api/leads/documents/signed-url?id=${doc.id}`);
      if (!res.ok) {
        setError("Couldn't open file");
        return;
      }
      const data = await res.json();
      setPreview({ url: data.url, name: doc.file_name, mime: doc.mime_type });
    } catch {
      setError("Couldn't open file");
    }
  };

  const downloadDoc = async (doc: LeadDoc) => {
    try {
      const res = await fetch(`/api/leads/documents/signed-url?id=${doc.id}`);
      if (!res.ok) return;
      const data = await res.json();
      // Trigger download via anchor
      const a = document.createElement("a");
      a.href = data.url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // noop
    }
  };

  const deleteDoc = async (doc: LeadDoc) => {
    if (!confirm(`Delete ${doc.file_name}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/leads/documents?id=${doc.id}`, { method: "DELETE" });
      if (res.ok) {
        setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      }
    } catch {
      // noop
    }
  };

  const filtered = activeCategory === "all" ? docs : docs.filter((d) => d.category === activeCategory);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <FileCheck className="h-4 w-4 text-brand-600" />
          <h3 className="text-sm font-semibold text-gray-900">Documents</h3>
          {docs.length > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
              {docs.length}
            </span>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => {
          const count = cat.value === "all" ? docs.length : docs.filter((d) => d.category === cat.value).length;
          if (cat.value !== "all" && count === 0) return null;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => setActiveCategory(cat.value)}
              className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                activeCategory === cat.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.label}
              {count > 0 && (
                <span className={`ml-1 ${activeCategory === cat.value ? "text-gray-300" : "text-gray-400"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Drop zone / upload area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-4 transition-colors ${
          dragOver
            ? "border-brand-400 bg-brand-50/50"
            : "border-gray-200 bg-gray-50/40"
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <Upload className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
            <div>
              <p className="text-xs font-medium text-gray-700">
                Drop files here or click to upload
              </p>
              <p className="mt-0.5 text-[10px] text-gray-500">
                PDF, DOC, JPG, PNG. Max 50 MB each.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700 focus:border-brand-400 focus:outline-none"
            >
              <option value="contract">Contract</option>
              <option value="inspection">Inspection</option>
              <option value="financing">Financing</option>
              <option value="disclosure">Disclosure</option>
              <option value="other">Other</option>
            </select>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {uploading ? "Uploading" : "Upload"}
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
          accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp,image/heic,image/heif"
        />
        {uploadProgress && (
          <p className="mt-2 text-[10px] text-brand-700">{uploadProgress}</p>
        )}
        {error && (
          <p className="mt-2 text-[10px] text-red-600">{error}</p>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="h-16 animate-pulse rounded-lg bg-gray-50" />
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-white p-4 text-center text-xs text-gray-500">
          {activeCategory === "all"
            ? "No documents yet. Upload a contract, disclosure, or inspection to keep everything in one place."
            : "Nothing in this category yet."}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {filtered.map((doc) => {
            const Icon = iconForMime(doc.mime_type);
            return (
              <li
                key={doc.id}
                className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white p-2.5 transition-colors hover:border-gray-200 hover:bg-gray-50/50"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gray-100">
                  <Icon className="h-4 w-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium text-gray-900">{doc.file_name}</p>
                  <p className="text-[10px] text-gray-500">
                    {formatSize(doc.file_size)}
                    {" · "}
                    {new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {" · "}
                    <span className="capitalize">{doc.category}</span>
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openDoc(doc)}
                    title="Preview"
                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadDoc(doc)}
                    title="Download"
                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteDoc(doc)}
                    title="Delete"
                    className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <p className="truncate text-sm font-medium text-gray-900">{preview.name}</p>
              <button
                onClick={() => setPreview(null)}
                aria-label="Close preview"
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50">
              {preview.mime?.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt={preview.name}
                  className="mx-auto max-h-[80vh] object-contain"
                />
              ) : preview.mime === "application/pdf" ? (
                <iframe
                  src={preview.url}
                  title={preview.name}
                  className="h-[80vh] w-full"
                />
              ) : (
                <div className="flex h-64 flex-col items-center justify-center gap-3 p-8 text-center">
                  <FileText className="h-10 w-10 text-gray-300" />
                  <p className="text-sm text-gray-600">
                    Preview not available for this file type.
                  </p>
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-4 py-2 text-xs font-medium text-white hover:bg-brand-600"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download to view
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
