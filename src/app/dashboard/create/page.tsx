"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Upload,
  X,
  GripVertical,
  Loader2,
  Save,
  Globe,
} from "lucide-react";
import type { ListingPhoto } from "@/lib/types";

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

  // Form state
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

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
          alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
        });
      }

      setPhotos((prev) => [...prev, ...newPhotos]);
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

      const { error: insertError } = await supabase.from("listings").insert({
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
      });

      if (insertError) throw insertError;

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
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
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
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="4750000"
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
                type="number"
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="4820"
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
                onChange={(e) => setLotSize(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="0.38 acres"
              />
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-gray-900">
            Description
          </h2>
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
          <h2 className="font-serif text-lg font-semibold text-gray-900">
            Property Highlights
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            One feature per line. These appear as bullet points on the listing.
          </p>
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
          <h2 className="font-serif text-lg font-semibold text-gray-900">
            Photos
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Upload high-quality photos. The first photo becomes the hero image.
          </p>

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
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo, i) => (
                <div
                  key={i}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="h-full w-full object-cover"
                  />
                  {i === 0 && (
                    <span className="absolute left-2 top-2 rounded bg-gray-900/80 px-2 py-0.5 text-xs font-medium text-white">
                      Hero
                    </span>
                  )}
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-2 left-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <GripVertical className="h-4 w-4 text-white drop-shadow" />
                  </div>
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
