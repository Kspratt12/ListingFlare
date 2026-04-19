"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import {
  Upload,
  X,
  Loader2,
  Save,
  Globe,
  Trash2,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  Video,
  QrCode,
  Lock,
} from "lucide-react";
import type { ListingPhoto, ListingVideo, AgentProfile } from "@/lib/types";
import Link from "next/link";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { formatNumber, parseNumber, formatLotSize } from "@/lib/formatters";
import { validateUpload } from "@/lib/validateUpload";
import { getSubscriptionLimits } from "@/lib/subscription";
import SellerPortalCard from "@/components/SellerPortalCard";
import JustSoldBlast from "@/components/JustSoldBlast";
// UpgradePrompt available if needed for future gating

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const limits = getSubscriptionLimits(profile);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Unsaved changes warning
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);
  const [currentStatus, setCurrentStatus] = useState("draft");
  const [currentSlug, setCurrentSlug] = useState("");

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
  const [virtualTourUrl, setVirtualTourUrl] = useState("");
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  const [videos, setVideos] = useState<ListingVideo[]>([]);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [generatingFeatures, setGeneratingFeatures] = useState(false);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);
  const [generatingFlyer, setGeneratingFlyer] = useState(false);

  // MLS-parity fields - all optional, collapsed by default
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [mlsId, setMlsId] = useState("");
  const [county, setCounty] = useState("");
  const [subdivision, setSubdivision] = useState("");
  const [architecturalStyle, setArchitecturalStyle] = useState("");
  const [propertySubtype, setPropertySubtype] = useState("");
  const [stories, setStories] = useState("");
  const [parkingSpaces, setParkingSpaces] = useState("");
  const [propertyTaxAnnual, setPropertyTaxAnnual] = useState("");
  const [hoaRequired, setHoaRequired] = useState(false);
  const [hoaFeeMonthly, setHoaFeeMonthly] = useState("");
  const [heatingType, setHeatingType] = useState("");
  const [coolingType, setCoolingType] = useState("");
  const [waterSource, setWaterSource] = useState("");
  const [sewerType, setSewerType] = useState("");
  const [roofType, setRoofType] = useState("");
  const [constructionMaterial, setConstructionMaterial] = useState("");
  const [foundationType, setFoundationType] = useState("");
  const [appliancesText, setAppliancesText] = useState("");
  const [schoolElementary, setSchoolElementary] = useState("");
  const [schoolMiddle, setSchoolMiddle] = useState("");
  const [schoolHigh, setSchoolHigh] = useState("");
  const [parcelNumber, setParcelNumber] = useState("");
  const [fireplaceCount, setFireplaceCount] = useState("");
  const [laundryLocation, setLaundryLocation] = useState("");
  const [basementType, setBasementType] = useState("");
  const [launchDate, setLaunchDate] = useState("");
  const [videoIntroUrl, setVideoIntroUrl] = useState("");
  // Track previous price + history so we can auto-log price changes
  const [loadedPrice, setLoadedPrice] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<Array<{ date: string; price: number; event: string }>>([]);

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
      // Silently fail
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

  const handleGenerateFlyer = async () => {
    setGeneratingFlyer(true);
    try {
      const res = await fetch("/api/open-house/flyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      if (!res.ok) throw new Error("Failed to generate flyer");
      const html = await res.text();
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 500);
      }
    } catch {
      setError("Failed to generate open house flyer");
    } finally {
      setGeneratingFlyer(false);
    }
  };

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

  useEffect(() => {
    async function fetchListing() {
      // Fetch profile for subscription limits
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from("agent_profiles").select("*").eq("id", user.id).single();
        if (p) setProfile(p as AgentProfile);
      }

      const { data, error: fetchError } = await supabase
        .from("listings")
        .select("*")
        .eq("id", listingId)
        .single();

      if (fetchError || !data) {
        router.push("/dashboard");
        return;
      }

      setStreet(data.street || "");
      setCity(data.city || "");
      setState(data.state || "CA");
      setZip(data.zip || "");
      setPrice(data.price ? String(data.price) : "");
      setBeds(data.beds ? String(data.beds) : "");
      setBaths(data.baths ? String(data.baths) : "");
      setSqft(data.sqft ? String(data.sqft) : "");
      setYearBuilt(data.year_built ? String(data.year_built) : "");
      setLotSize(formatLotSize(data.lot_size || ""));
      setDescription(data.description || "");
      setFeaturesText((data.features || []).join("\n"));
      setPhotos(data.photos || []);
      setVideos(data.videos || []);
      setVirtualTourUrl(data.virtual_tour_url || "");
      setCurrentStatus(data.status || "draft");
      setCurrentSlug(data.slug || "");
      // MLS-parity fields
      setMlsId(data.mls_id || "");
      setCounty(data.county || "");
      setSubdivision(data.subdivision || "");
      setArchitecturalStyle(data.architectural_style || "");
      setPropertySubtype(data.property_subtype || "");
      setStories(data.stories ? String(data.stories) : "");
      setParkingSpaces(data.parking_spaces ? String(data.parking_spaces) : "");
      setPropertyTaxAnnual(data.property_tax_annual ? String(data.property_tax_annual) : "");
      setHoaRequired(Boolean(data.hoa_required));
      setHoaFeeMonthly(data.hoa_fee_monthly ? String(data.hoa_fee_monthly) : "");
      setHeatingType(data.heating_type || "");
      setCoolingType(data.cooling_type || "");
      setWaterSource(data.water_source || "");
      setSewerType(data.sewer_type || "");
      setRoofType(data.roof_type || "");
      setConstructionMaterial(data.construction_material || "");
      setFoundationType(data.foundation_type || "");
      setAppliancesText((data.appliances_included || []).join("\n"));
      setSchoolElementary(data.school_elementary || "");
      setSchoolMiddle(data.school_middle || "");
      setSchoolHigh(data.school_high || "");
      setParcelNumber(data.parcel_number || "");
      setFireplaceCount(data.fireplace_count ? String(data.fireplace_count) : "");
      setLaundryLocation(data.laundry_location || "");
      setBasementType(data.basement_type || "");
      setLaunchDate(data.launch_date ? new Date(data.launch_date).toISOString().slice(0, 16) : "");
      setVideoIntroUrl(data.video_intro_url || "");
      setLoadedPrice(data.price || null);
      setPriceHistory(Array.isArray(data.price_history) ? data.price_history : []);
      setHasUnsavedChanges(false);
      setLoading(false);
    }
    fetchListing();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!limits.isPaid && photos.length + files.length > limits.maxPhotos) {
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
        const vErr = validateUpload(file, { kind: "image" });
        if (vErr) throw new Error(vErr);
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
    if (limits.maxVideos === 0) {
      setError("Video uploads are available on the paid plan. Upgrade to upload 8K videos.");
      return;
    }
    if (videos.length + files.length > limits.maxVideos) {
      setError(`Maximum ${limits.maxVideos} videos allowed`);
      return;
    }

    setUploadingVideos(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const newVideos: ListingVideo[] = [];

      for (const file of Array.from(files)) {
        const vErr = validateUpload(file, { kind: "video" });
        if (vErr) throw new Error(vErr);

        const ext = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-photos")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("listing-photos").getPublicUrl(fileName);

        newVideos.push({
          src: publicUrl,
          alt: "",
        });
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

  const handleSave = async (status: string) => {
    if (status === "published" && !street.trim()) {
      setError("Street address is required to publish.");
      return;
    }
    if (status === "published" && !city.trim()) {
      setError("City is required to publish.");
      return;
    }
    if (status === "published" && !price) {
      setError("Price is required to publish.");
      return;
    }
    if (status === "published") {
      setPublishing(true);
    } else {
      setSaving(true);
    }
    setError("");

    try {
      const features = featuresText
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);

      const appliances = appliancesText
        .split("\n")
        .map((a) => a.trim())
        .filter(Boolean);

      // Generate clean URL slug from address
      const { generateSlug } = await import("@/lib/slug");
      const slug = generateSlug(street, city, listingId);

      const newPrice = parseInt(price) || 0;

      // Auto-log price history entries when price changes or status transitions
      const nextHistory = [...priceHistory];
      const isNewlyPublished = status === "published" && currentStatus !== "published";
      const priceChanged = loadedPrice != null && newPrice !== loadedPrice && newPrice > 0;
      const nowIso = new Date().toISOString();

      if (isNewlyPublished && nextHistory.length === 0) {
        nextHistory.push({ date: nowIso, price: newPrice, event: "listed" });
      } else if (priceChanged) {
        const event = newPrice < (loadedPrice || 0) ? "reduced" : "increased";
        nextHistory.push({ date: nowIso, price: newPrice, event });
      } else if (status === "pending" && currentStatus !== "pending") {
        nextHistory.push({ date: nowIso, price: newPrice, event: "pending" });
      } else if (status === "closed" && currentStatus !== "closed") {
        nextHistory.push({ date: nowIso, price: newPrice, event: "sold" });
      }

      const { error: updateError } = await supabase
        .from("listings")
        .update({
          status,
          street,
          city,
          state,
          zip,
          price: newPrice,
          beds: parseInt(beds) || 0,
          baths: parseFloat(baths) || 0,
          sqft: parseInt(sqft) || 0,
          year_built: yearBuilt ? parseInt(yearBuilt) : null,
          lot_size: lotSize,
          description,
          features,
          photos,
          videos,
          virtual_tour_url: virtualTourUrl,
          slug,
          // MLS-parity fields (send null when empty so DB stays clean)
          mls_id: mlsId || null,
          county: county || null,
          subdivision: subdivision || null,
          architectural_style: architecturalStyle || null,
          property_subtype: propertySubtype || null,
          stories: stories ? parseInt(stories) : null,
          parking_spaces: parkingSpaces ? parseInt(parkingSpaces) : null,
          property_tax_annual: propertyTaxAnnual ? Number(propertyTaxAnnual) : null,
          hoa_required: hoaRequired,
          hoa_fee_monthly: hoaFeeMonthly ? Number(hoaFeeMonthly) : null,
          heating_type: heatingType || null,
          cooling_type: coolingType || null,
          water_source: waterSource || null,
          sewer_type: sewerType || null,
          roof_type: roofType || null,
          construction_material: constructionMaterial || null,
          foundation_type: foundationType || null,
          appliances_included: appliances,
          school_elementary: schoolElementary || null,
          school_middle: schoolMiddle || null,
          school_high: schoolHigh || null,
          parcel_number: parcelNumber || null,
          fireplace_count: fireplaceCount ? parseInt(fireplaceCount) : null,
          laundry_location: laundryLocation || null,
          basement_type: basementType || null,
          launch_date: launchDate ? new Date(launchDate).toISOString() : null,
          video_intro_url: videoIntroUrl || null,
          price_history: nextHistory,
          updated_at: new Date().toISOString(),
        })
        .eq("id", listingId);

      if (updateError) throw updateError;

      setPriceHistory(nextHistory);
      setLoadedPrice(newPrice);

      // Fire subscriber alerts if the price changed or a major status transition happened
      const didAddHistory = nextHistory.length > priceHistory.length;
      if (didAddHistory) {
        const latest = nextHistory[nextHistory.length - 1];
        const mapEventToAlert: Record<string, string | null> = {
          listed: null, // Don't email on initial listing - subscribers don't exist yet
          reduced: "reduced",
          increased: "increased",
          pending: "pending",
          sold: "sold",
          relisted: "relisted",
        };
        const alertEvent = mapEventToAlert[latest.event];
        if (alertEvent) {
          fetch("/api/listings/alerts/fire", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              listingId,
              event: alertEvent,
              oldPrice: loadedPrice,
              newPrice,
            }),
          }).catch((err) => console.error("Alert fire error:", err));
        }
      }

      // If transitioning to published from a non-published state, notify past leads (non-blocking)
      if (status === "published" && currentStatus !== "published") {
        fetch("/api/listings/notify-past-leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId }),
        }).catch(() => {});
      }

      setCurrentStatus(status);
      setCurrentSlug(slug);
      setHasUnsavedChanges(false);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("listings")
        .delete()
        .eq("id", listingId);

      if (deleteError) throw deleteError;

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-8 space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-gray-200 bg-white" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to listings
          </Link>
          <h1 className="mt-2 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
            Edit Listing
          </h1>
          <p className="mt-1 text-gray-500">
            {street || "Untitled"} &bull;{" "}
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
              currentStatus === "published"
                ? "bg-green-50 text-green-700"
                : currentStatus === "archived"
                ? "bg-amber-50 text-amber-700"
                : "bg-gray-100 text-gray-600"
            }`}>
              {currentStatus}
            </span>
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div className="mt-8 space-y-8" onChange={() => setHasUnsavedChanges(true)}>
        {/* Address */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-gray-900">Address</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Street Address</label>
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
                <label className="mb-1.5 block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="Pacific Palisades"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">State</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                >
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ZIP Code</label>
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
          <h2 className="font-serif text-lg font-semibold text-gray-900">Property Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Price ($)</label>
              <input type="text" value={formatNumber(price)} onChange={(e) => setPrice(parseNumber(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="4,750,000" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Bedrooms</label>
              <input type="number" value={beds} onChange={(e) => setBeds(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="5" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Bathrooms</label>
              <input type="number" step="0.5" value={baths} onChange={(e) => setBaths(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="4.5" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Square Feet</label>
              <input type="text" value={formatNumber(sqft)} onChange={(e) => setSqft(parseNumber(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="4,820" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Year Built</label>
              <input type="number" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="2019" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Lot Size</label>
              <input type="text" value={lotSize} onChange={(e) => setLotSize(formatLotSize(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="10,000 sqft or 0.38 acres" />
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-gray-900">Description</h2>
            <button
              type="button"
              onClick={() => handleAIGenerate("description")}
              disabled={generatingDesc}
              className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-50"
            >
              {generatingDesc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {generatingDesc ? "Generating..." : description.trim() ? "Regenerate" : "AI Generate"}
            </button>
          </div>
          <div className="mt-4">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              placeholder="Describe the property in detail."
            />
          </div>
        </section>

        {/* Features */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-semibold text-gray-900">Property Highlights</h2>
              <p className="mt-1 text-sm text-gray-500">One feature per line.</p>
            </div>
            <button
              type="button"
              onClick={() => handleAIGenerate("features")}
              disabled={generatingFeatures}
              className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-50"
            >
              {generatingFeatures ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {generatingFeatures ? "Generating..." : featuresText.trim() ? "Regenerate" : "AI Generate"}
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

          <div className="mt-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-10 transition-colors hover:border-brand-300 hover:bg-brand-50/30">
              {uploadingPhotos ? (
                <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
              ) : (
                <Upload className="h-8 w-8 text-gray-400" />
              )}
              <span className="mt-2 text-sm font-medium text-gray-600">
                {uploadingPhotos ? "Uploading..." : "Click to upload or drag & drop"}
              </span>
              <span className="mt-1 text-xs text-gray-400">JPG, PNG, WebP up to 10MB each</span>
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
                      aria-label="Remove photo"
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white opacity-100 transition-opacity hover:bg-red-600 active:scale-95 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
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
              {uploadingVideos ? (
                <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
              ) : (
                <Video className="h-8 w-8 text-gray-400" />
              )}
              <span className="mt-2 text-sm font-medium text-gray-600">
                {uploadingVideos ? "Uploading..." : "Click to upload videos"}
              </span>
              <span className="mt-1 text-xs text-gray-400">{videos.length}/{limits.maxVideos} videos</span>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                multiple
                onChange={handleVideoUpload}
                className="hidden"
                disabled={uploadingVideos || videos.length >= limits.maxVideos}
              />
            </label>
          </div>
          )}

          {videos.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {videos.map((video, i) => (
                <div key={i} className="group relative overflow-hidden rounded-lg border border-gray-200 bg-black">
                  <video
                    src={video.src}
                    className="aspect-video w-full object-contain"
                    controls
                    preload="metadata"
                  />
                  <button
                    onClick={() => removeVideo(i)}
                    aria-label="Remove video"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white opacity-100 transition-opacity hover:bg-red-600 active:scale-95 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Virtual Tour */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-gray-900">Virtual Tour</h2>
          <p className="mt-1 text-sm text-gray-500">Paste a link from Matterport, Kuula, CloudPano, or any 360° tour provider. The tour will be embedded directly on your listing page.</p>
          <input
            type="url"
            value={virtualTourUrl}
            onChange={(e) => setVirtualTourUrl(e.target.value)}
            className="mt-4 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            placeholder="https://my.matterport.com/show/?m=..."
          />
          {virtualTourUrl && (
            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={virtualTourUrl}
                  title="Virtual Tour Preview"
                  className="absolute inset-0 h-full w-full"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
          )}
        </section>

        {/* Video Intro (personal touch) */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-gray-900">Your Video Intro (optional)</h2>
          <p className="mt-1 text-sm text-gray-500">A 30-second phone video welcoming buyers. Record one on your phone, upload to YouTube (unlisted) or paste a direct MP4 link. Appears above the photo gallery and kills the cold Zillow feel.</p>
          <input
            type="url"
            value={videoIntroUrl}
            onChange={(e) => { setVideoIntroUrl(e.target.value); setHasUnsavedChanges(true); }}
            className="mt-4 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            placeholder="https://youtu.be/... or direct .mp4 URL"
          />
        </section>

        {/* Coming Soon launch date */}
        {currentStatus === "coming_soon" && (
          <section className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50/60 to-white p-6">
            <h2 className="font-serif text-lg font-semibold text-gray-900">Launch Date</h2>
            <p className="mt-1 text-sm text-gray-600">
              When does this listing go live on MLS? Buyers subscribing from the coming-soon page get an email when you change the status to Published.
            </p>
            <input
              type="datetime-local"
              value={launchDate}
              onChange={(e) => { setLaunchDate(e.target.value); setHasUnsavedChanges(true); }}
              className="mt-4 w-full max-w-md rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </section>
        )}

        {/* Full property details (optional) - collapsible */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="flex w-full items-center justify-between gap-3"
          >
            <div className="text-left">
              <h2 className="font-serif text-lg font-semibold text-gray-900">
                Full property details
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                County, HOA, taxes, schools, heating/cooling, construction. All optional. Shows up on your listing page as a polished MLS-style table.
              </p>
            </div>
            <span className="flex-shrink-0 rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
              {advancedOpen ? "Hide" : "Open"}
            </span>
          </button>

          {advancedOpen && (
            <div className="mt-6 space-y-6 border-t border-gray-100 pt-6">
              {/* Identifiers */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">MLS ID</label>
                  <input
                    type="text"
                    value={mlsId}
                    onChange={(e) => { setMlsId(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="e.g. 10153182"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">County</label>
                  <input
                    type="text"
                    value={county}
                    onChange={(e) => { setCounty(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="e.g. Wake"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Subdivision / Neighborhood</label>
                  <input
                    type="text"
                    value={subdivision}
                    onChange={(e) => { setSubdivision(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="e.g. Pleasant Grove"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Property Type</label>
                  <input
                    type="text"
                    value={propertySubtype}
                    onChange={(e) => { setPropertySubtype(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="Single Family Residence"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Architectural Style</label>
                  <input
                    type="text"
                    value={architecturalStyle}
                    onChange={(e) => { setArchitecturalStyle(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="Colonial, Ranch, Craftsman..."
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Stories</label>
                    <input
                      type="number"
                      value={stories}
                      onChange={(e) => { setStories(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="2"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Parking</label>
                    <input
                      type="number"
                      value={parkingSpaces}
                      onChange={(e) => { setParkingSpaces(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="2"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                </div>
              </div>

              {/* Taxes + HOA */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Taxes & HOA</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Annual Property Tax ($)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={propertyTaxAnnual}
                      onChange={(e) => { setPropertyTaxAnnual(e.target.value.replace(/[^0-9.]/g, "")); setHasUnsavedChanges(true); }}
                      placeholder="2196"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 pb-2">
                      <input
                        type="checkbox"
                        checked={hoaRequired}
                        onChange={(e) => { setHoaRequired(e.target.checked); setHasUnsavedChanges(true); }}
                        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400"
                      />
                      <span className="text-sm text-gray-700">Has HOA</span>
                    </label>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">HOA ($/mo)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={hoaFeeMonthly}
                      onChange={(e) => { setHoaFeeMonthly(e.target.value.replace(/[^0-9.]/g, "")); setHasUnsavedChanges(true); }}
                      placeholder="0"
                      disabled={!hoaRequired}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Systems */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Systems</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Heating</label>
                    <input
                      type="text"
                      value={heatingType}
                      onChange={(e) => { setHeatingType(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="Forced Air, Heat Pump, Electric..."
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Cooling</label>
                    <input
                      type="text"
                      value={coolingType}
                      onChange={(e) => { setCoolingType(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="Central Air, Zoned..."
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Water Source</label>
                    <input
                      type="text"
                      value={waterSource}
                      onChange={(e) => { setWaterSource(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="Public, Well..."
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Sewer</label>
                    <input
                      type="text"
                      value={sewerType}
                      onChange={(e) => { setSewerType(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="Public Sewer, Septic..."
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                </div>
              </div>

              {/* Construction */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Construction</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Roof</label>
                    <input
                      type="text"
                      value={roofType}
                      onChange={(e) => { setRoofType(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="Shingle, Metal..."
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Construction Material</label>
                    <input
                      type="text"
                      value={constructionMaterial}
                      onChange={(e) => { setConstructionMaterial(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="Brick, Stucco, Vinyl..."
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Foundation</label>
                    <input
                      type="text"
                      value={foundationType}
                      onChange={(e) => { setFoundationType(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="Slab, Crawl, Basement..."
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                </div>
              </div>

              {/* Appliances */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Appliances Included (one per line)</label>
                <textarea
                  value={appliancesText}
                  onChange={(e) => { setAppliancesText(e.target.value); setHasUnsavedChanges(true); }}
                  rows={3}
                  placeholder={"Refrigerator\nDishwasher\nRange / Oven\nWasher\nDryer"}
                  className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>

              {/* Interior / Other */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Interior Details</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Fireplaces</label>
                    <input
                      type="number"
                      value={fireplaceCount}
                      onChange={(e) => { setFireplaceCount(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="0"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Laundry</label>
                    <input
                      type="text"
                      value={laundryLocation}
                      onChange={(e) => { setLaundryLocation(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="Laundry Room, Main Level"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Basement</label>
                    <input
                      type="text"
                      value={basementType}
                      onChange={(e) => { setBasementType(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="Finished, Unfinished, None..."
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Parcel Number (APN)</label>
                    <input
                      type="text"
                      value={parcelNumber}
                      onChange={(e) => { setParcelNumber(e.target.value); setHasUnsavedChanges(true); }}
                      placeholder="e.g. 4412-018-024"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                </div>
              </div>

              {/* Schools */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Schools</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Elementary</label>
                    <input
                      type="text"
                      value={schoolElementary}
                      onChange={(e) => { setSchoolElementary(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Middle</label>
                    <input
                      type="text"
                      value={schoolMiddle}
                      onChange={(e) => { setSchoolMiddle(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">High</label>
                    <input
                      type="text"
                      value={schoolHigh}
                      onChange={(e) => { setSchoolHigh(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                </div>
              </div>

              {priceHistory.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">Price History (auto-tracked)</h3>
                  <ul className="space-y-1 rounded-md border border-gray-100 bg-gray-50 p-3">
                    {[...priceHistory].reverse().map((h, i) => (
                      <li key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{new Date(h.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · <span className="capitalize">{h.event}</span></span>
                        <span className="font-semibold text-gray-900">${h.price.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[10px] text-gray-400">
                    A new entry is added automatically whenever the price changes or the listing status goes to Pending or Closed.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Seller Portal */}
        <SellerPortalCard listingId={listingId} />

        {/* Just Sold blast - only appears once the listing is closed/sold */}
        {currentStatus === "closed" && (
          <JustSoldBlast
            listingAddress={[street, city].filter(Boolean).join(", ") || "the home"}
            listingPrice={price ? Number(String(price).replace(/[^0-9.]/g, "")) : null}
          />
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 border-t border-gray-200 pb-10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Confirm Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}
            {currentStatus === "published" && (
              <div className="flex items-center gap-2">
                <select
                  value={currentStatus}
                  onChange={(e) => handleSave(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 cursor-pointer"
                >
                  <option value="coming_soon">Coming Soon</option>
                  <option value="published">Published</option>
                  <option value="pending">Pending</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {currentStatus === "published" && (
              <button
                onClick={handleGenerateFlyer}
                disabled={generatingFlyer}
                className="flex items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50/50 px-4 py-2.5 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100 disabled:opacity-50"
              >
                {generatingFlyer ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                Open House Flyer
              </button>
            )}
            {currentStatus === "published" && (
              <Link
                href={`/listing/${currentSlug || listingId}`}
                target="_blank"
                className="flex items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50/50 px-5 py-2.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100"
              >
                <ExternalLink className="h-4 w-4" />
                View Listing
              </Link>
            )}
            <button
              onClick={() => handleSave(currentStatus === "published" ? "published" : "draft")}
              disabled={saving || publishing}
              className="flex items-center justify-center gap-2 rounded-lg bg-gray-950 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
            {currentStatus !== "published" && (
              <button
                onClick={() => handleSave("published")}
                disabled={saving || publishing}
                className="flex items-center justify-center gap-2 rounded-lg bg-gray-950 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                Publish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
