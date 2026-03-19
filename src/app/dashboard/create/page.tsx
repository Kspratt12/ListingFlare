"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Upload,
  X,
  Loader2,
  Save,
  Globe,
  Sparkles,
  Video,
  Lock,
} from "lucide-react";
import type { ListingPhoto, ListingVideo, AgentProfile } from "@/lib/types";
import Link from "next/link";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { formatNumber, parseNumber, formatLotSize } from "@/lib/formatters";
import { getSubscriptionLimits } from "@/lib/subscription";
import UpgradePrompt from "@/components/UpgradePrompt";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

export default function CreateListingPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [listingCount, setListingCount] = useState(0);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Form state — all hooks must be declared before any early return
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("CA");
  const [zip, setZip] = useState("");
  const [price, setPrice] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [description, setDescription] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  const [videos, setVideos] = useState<ListingVideo[]>([]);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [generatingFeatures, setGeneratingFeatures] = useState(false);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);

  const limits = getSubscriptionLimits(profile);

  const generateCaptions = async (newPhotos: ListingPhoto[]) => {
    if (newPhotos.length === 0) return;
    setGeneratingCaptions(true);
    try {
      const urls = newPhotos.map((p) => p.src);
      const res = await fetch("/api/ai/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrls: urls,
          property: { street, city, beds, baths, sqft },
        }),
      });
      if (!res.ok) throw new Error("Caption API failed");
      const { captions } = await res.json();
      const urlToCaption = new Map<string, string>();
      urls.forEach((url, i) => { if (captions[i]) urlToCaption.set(url, captions[i]); });
      setPhotos((prev) =>
        prev.map((photo) => urlToCaption.has(photo.src) ? { ...photo, alt: urlToCaption.get(photo.src)! } : photo)
      );
    } catch {
      // Silently fail — captions are a nice-to-have
    } finally {
      setGeneratingCaptions(false);
    }
  };

  const regenerateAllCaptions = async () => {
    if (photos.length === 0) return;
    setGeneratingCaptions(true);
    try {
      const res = await fetch("/api/ai/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrls: photos.map((p) => p.src),
          property: { street, city, beds, baths, sqft },
        }),
      });
      if (!res.ok) throw new Error("Caption API failed");
      const { captions } = await res.json();
      setPhotos((prev) =>
        prev.map((photo, i) => (captions[i] ? { ...photo, alt: captions[i] } : photo))
      );
    } catch {
      setError("Failed to generate captions");
    } finally {
      setGeneratingCaptions(false);
    }
  };

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("agent_profiles").select("*").eq("id", user.id).single();
      if (p) setProfile(p as AgentProfile);
      const { count } = await supabase.from("listings").select("*", { count: "exact", head: true }).eq("agent_id", user.id);
      setListingCount(count || 0);
      setCheckingAccess(false);
    }
    checkAccess();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checkingAccess && !limits.isPaid && listingCount >= limits.maxListings) {
    return (
      <div className="mx-auto max-w-lg pt-12">
        <UpgradePrompt
          title="Listing Limit Reached"
          message="Your free trial allows 1 listing. Upgrade to create unlimited listings with full photo galleries, 8K video uploads, lead replies, social posts, and more."
        />
      </div>
    );
  }

  const getPropertyContext = () => ({
    street, city, state, zip, price, beds, baths, sqft, yearBuilt, lotSize,
  });

  const handleAIGenerate = async (type: "description" | "features") => {
    const setter = type === "description" ? setGeneratingDesc : setGeneratingFeatures;
    setter(true);
    setError("");

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          property: getPropertyContext(),
          existing: type === "description" ? description : featuresText,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate");

      const { text } = await res.json();
      if (type === "description") {
        setDescription(text);
      } else {
        setFeaturesText(text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setter(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > limits.maxPhotos) {
      setError(`Free trial allows up to ${limits.maxPhotos} photos. Upgrade for unlimited.`);
      return;
    }

    setUploadingPhotos(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const newPhotos: ListingPhoto[] = [];

      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-photos")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("listing-photos").getPublicUrl(fileName);

        newPhotos.push({
          src: publicUrl,
          alt: "Generating caption...",
        });
      }

      setPhotos((prev) => [...prev, ...newPhotos]);
      generateCaptions(newPhotos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (limits.maxVideos === 0) { setError("Video uploads are available on the paid plan. Upgrade to upload 8K videos."); return; }
    if (videos.length + files.length > limits.maxVideos) { setError(`Maximum ${limits.maxVideos} videos allowed`); return; }
    setUploadingVideos(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const newVideos: ListingVideo[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 500 * 1024 * 1024) throw new Error(`${file.name} exceeds 500MB limit`);
        const ext = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("listing-photos").upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("listing-photos").getPublicUrl(fileName);
        newVideos.push({ src: publicUrl, alt: "" });
      }
      setVideos((prev) => [...prev, ...newVideos]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Video upload failed");
    } finally {
      setUploadingVideos(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const removeVideo = (index: number) => {
    setVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (publish: boolean) => {
    if (publish) {
      setPublishing(true);
    } else {
      setSaving(true);
    }
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const features = featuresText
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);

      const { data: newListing, error: insertError } = await supabase.from("listings").insert({
        agent_id: user.id,
        status: publish ? "published" : "draft",
        street,
        city,
        state,
        zip,
        price: parseInt(price) || 0,
        beds: parseInt(beds) || 0,
        baths: parseFloat(baths) || 0,
        sqft: parseInt(sqft) || 0,
        year_built: yearBuilt ? parseInt(yearBuilt) : null,
        lot_size: lotSize,
        description,
        features,
        photos,
        videos,
      }).select("id").single();

      if (insertError) throw insertError;

      // Generate clean URL slug
      if (newListing?.id && street) {
        const { generateSlug } = await import("@/lib/slug");
        const slug = generateSlug(street, city, newListing.id);
        await supabase.from("listings").update({ slug }).eq("id", newListing.id);
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">
          Create New Listing
        </h1>
        <p className="mt-1 text-gray-500">
          Fill in the property details to generate a beautiful listing page.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 space-y-8">
        {/* Address */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-gray-900">
            Address
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Street Address
              </label>
              <AddressAutocomplete
                value={street}
                onChange={setStreet}
                onSelect={(addr) => {
                  setStreet(addr.street);
                  setCity(addr.city);
                  setState(addr.state);
                  setZip(addr.zip);
                }}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="1847 Grandview Terrace"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="Pacific Palisades"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  State
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                >
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="90272"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Property Details */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-gray-900">
            Property Details
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Price ($)
              </label>
              <input
                type="text"
                value={formatNumber(price)}
                onChange={(e) => setPrice(parseNumber(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="4,750,000"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Bedrooms
              </label>
              <input
                type="number"
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="5"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Bathrooms
              </label>
              <input
                type="number"
                step="0.5"
                value={baths}
                onChange={(e) => setBaths(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="4.5"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Square Feet
              </label>
              <input
                type="text"
                value={formatNumber(sqft)}
                onChange={(e) => setSqft(parseNumber(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="4,820"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Year Built
              </label>
              <input
                type="number"
                value={yearBuilt}
                onChange={(e) => setYearBuilt(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="2019"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Lot Size
              </label>
              <input
                type="text"
                value={lotSize}
                onChange={(e) => setLotSize(formatLotSize(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="10,000 sqft or 0.38 acres"
              />
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-gray-900">
              Description
            </h2>
            <button
              type="button"
              onClick={() => handleAIGenerate("description")}
              disabled={generatingDesc}
              className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-50"
            >
              {generatingDesc ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {generatingDesc ? "Generating..." : "AI Generate"}
            </button>
          </div>
          <div className="mt-4">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              placeholder="Describe the property in detail. Use blank lines between paragraphs for best formatting on the listing page."
            />
          </div>
        </section>

        {/* Features */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-semibold text-gray-900">
                Property Highlights
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                One feature per line. These appear as bullet points on the listing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleAIGenerate("features")}
              disabled={generatingFeatures}
              className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-50"
            >
              {generatingFeatures ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {generatingFeatures ? "Generating..." : "AI Generate"}
            </button>
          </div>
          <div className="mt-4">
            <textarea
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              rows={6}
              className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              placeholder={"Panoramic Ocean Views\nInfinity Edge Pool & Spa\nChef's Kitchen with Wine Room"}
            />
          </div>
        </section>

        {/* Photos */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-semibold text-gray-900">Photos</h2>
              <p className="mt-1 text-sm text-gray-500">Upload high-quality photos (2000px+ wide recommended). The first photo becomes the full-screen hero image.</p>
            </div>
            {!limits.isPaid && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                {photos.length}/{limits.maxPhotos} on free trial
              </span>
            )}
          </div>

          {/* Upload area */}
          <div className="mt-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-10 transition-colors hover:border-brand-300 hover:bg-brand-50/30">
              {uploadingPhotos ? (
                <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
              ) : (
                <Upload className="h-8 w-8 text-gray-400" />
              )}
              <span className="mt-2 text-sm font-medium text-gray-600">
                {uploadingPhotos
                  ? "Uploading..."
                  : "Click to upload or drag & drop"}
              </span>
              <span className="mt-1 text-xs text-gray-400">
                JPG, PNG, WebP up to 10MB each
              </span>
              <span className="mt-2 text-xs text-gray-500">
                <span className="hidden sm:inline"><strong>Hold Ctrl</strong> (or <strong>Cmd</strong> on Mac) and click to select multiple photos</span>
                <span className="sm:hidden"><strong>Tap to select multiple photos</strong> from your gallery</span>
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploadingPhotos}
              />
            </label>
          </div>

          {/* Photo grid */}
          {photos.length > 0 && (
            <>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-400">{photos.length} photo{photos.length !== 1 ? "s" : ""} uploaded</p>
              <button
                type="button"
                onClick={regenerateAllCaptions}
                disabled={generatingCaptions}
                className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-50"
              >
                {generatingCaptions ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {generatingCaptions ? "Generating..." : "AI Captions"}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo, i) => (
                <div
                  key={`photo-${i}-${photo.src.slice(-20)}`}
                  className={`group cursor-grab active:cursor-grabbing ${dragOverIdx === i ? "ring-2 ring-brand-400 rounded-lg" : ""} ${dragIdx === i ? "opacity-40" : ""}`}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i); }}
                  onDragLeave={() => setDragOverIdx(null)}
                  onDrop={() => {
                    if (dragIdx === null || dragIdx === i) return;
                    const updated = [...photos];
                    const [moved] = updated.splice(dragIdx, 1);
                    updated.splice(i, 0, moved);
                    setPhotos(updated);
                    setDragIdx(null);
                    setDragOverIdx(null);
                  }}
                  onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover pointer-events-none" />
                    {i === 0 && (
                      <span className="absolute left-2 top-2 rounded bg-gray-900/80 px-2 py-0.5 text-xs font-medium text-white">Hero</span>
                    )}
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {i !== 0 && (
                      <button
                        onClick={() => {
                          const updated = [...photos];
                          const [moved] = updated.splice(i, 1);
                          updated.unshift(moved);
                          setPhotos(updated);
                        }}
                        className="absolute bottom-2 left-2 rounded bg-brand-500/80 px-1.5 py-1 text-[9px] font-bold text-white opacity-0 transition-opacity hover:bg-brand-600 group-hover:opacity-100"
                      >
                        HERO
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={photo.alt}
                    onChange={(e) => {
                      const updated = [...photos];
                      updated[i] = { ...updated[i], alt: e.target.value };
                      setPhotos(updated);
                    }}
                    placeholder="Add a caption..."
                    className="mt-1.5 w-full rounded border-0 bg-transparent px-1 py-0.5 text-xs text-gray-500 placeholder-gray-300 focus:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-300"
                  />
                </div>
              ))}
            </div>
            </>
          )}
        </section>

        {/* Videos */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-gray-900">Videos</h2>
          <p className="mt-1 text-sm text-gray-500">Upload up to 10 property videos. MP4, MOV, or WebM up to 500MB each for crystal clear quality.</p>
          {limits.maxVideos === 0 ? (
            <div className="mt-4">
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-8 opacity-60">
                <Lock className="h-8 w-8 text-gray-300" />
                <span className="mt-2 text-sm font-medium text-gray-400">Video uploads are a Pro feature</span>
                <span className="mt-1 text-xs text-gray-400">Upgrade to upload up to 10 videos in 8K quality</span>
                <Link href="/dashboard/billing" className="mt-3 rounded-full bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">
                  Upgrade to Pro
                </Link>
              </div>
            </div>
          ) : (
          <div className="mt-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-8 transition-colors hover:border-brand-300 hover:bg-brand-50/30">
              {uploadingVideos ? <Loader2 className="h-8 w-8 animate-spin text-brand-400" /> : <Video className="h-8 w-8 text-gray-400" />}
              <span className="mt-2 text-sm font-medium text-gray-600">{uploadingVideos ? "Uploading..." : "Click to upload videos"}</span>
              <span className="mt-1 text-xs text-gray-400">{videos.length}/{limits.maxVideos} videos</span>
              <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" multiple onChange={handleVideoUpload} className="hidden" disabled={uploadingVideos || videos.length >= limits.maxVideos} />
            </label>
          </div>
          )}
          {videos.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {videos.map((video, i) => (
                <div key={i} className="group relative overflow-hidden rounded-lg border border-gray-200 bg-black">
                  <video src={video.src} className="aspect-video w-full object-contain" controls preload="metadata" />
                  <button onClick={() => removeVideo(i)} className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Actions */}
        <div className="flex flex-col gap-3 pb-10 sm:flex-row sm:justify-end">
          <button
            onClick={() => handleSave(false)}
            disabled={saving || publishing}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save as Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || publishing}
            className="flex items-center justify-center gap-2 rounded-lg bg-gray-950 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
            Publish Listing
          </button>
        </div>
      </div>
    </div>
  );
}
