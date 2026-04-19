// Client-side gate before hitting Supabase Storage. The real enforcement
// must happen at the bucket level (Supabase dashboard → Storage → bucket
// settings: allowedMimeTypes + fileSizeLimit). This just gives users a
// friendly error instead of a confusing upload failure.

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB

interface ValidateOptions {
  kind: "image" | "video";
  maxBytes?: number;
}

export function validateUpload(file: File, opts: ValidateOptions): string | null {
  const allowed = opts.kind === "image" ? IMAGE_MIME_TYPES : VIDEO_MIME_TYPES;
  const defaultMax = opts.kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  const max = opts.maxBytes ?? defaultMax;

  // mime type on File is browser-inferred - not authoritative but good enough
  // as a first gate. Combined with Supabase bucket config, it's safe.
  if (file.type && !allowed.includes(file.type.toLowerCase())) {
    return `${file.name}: unsupported file type (${file.type}). ${opts.kind === "image" ? "Use JPG, PNG, WebP, or HEIC." : "Use MP4, MOV, or WebM."}`;
  }

  if (file.size > max) {
    const mb = Math.round(max / 1024 / 1024);
    return `${file.name}: exceeds ${mb}MB limit.`;
  }

  if (file.size === 0) {
    return `${file.name}: empty file.`;
  }

  return null; // valid
}
