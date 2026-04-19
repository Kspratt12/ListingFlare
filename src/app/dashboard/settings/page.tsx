"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AgentProfile } from "@/lib/types";
import { Loader2, Upload, CheckCircle } from "lucide-react";
import { formatPhone } from "@/lib/formatters";
import GoogleCalendarConnect from "@/components/GoogleCalendarConnect";

export default function SettingsPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [brokerage, setBrokerage] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [headshotUrl, setHeadshotUrl] = useState<string | null>(null);
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [zillow, setZillow] = useState("");
  const [realtorCom, setRealtorCom] = useState("");
  const [facebook, setFacebook] = useState("");
  const [website, setWebsite] = useState("");
  const [weeklyEmails, setWeeklyEmails] = useState(true);
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [aiApprovalMode, setAiApprovalMode] = useState(false);
  const [aiSavedAt, setAiSavedAt] = useState<number | null>(null);

  const toggleAiApproval = async (checked: boolean) => {
    setAiApprovalMode(checked);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("agent_profiles").update({ ai_approval_mode: checked }).eq("id", user.id);
      setAiSavedAt(Date.now());
      setTimeout(() => setAiSavedAt(null), 2000);
    } catch {
      // Revert on failure
      setAiApprovalMode(!checked);
    }
  };

  useEffect(() => {
    async function fetchProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("agent_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        const profile = data as AgentProfile;
        setName(profile.name);
        setTitle(profile.title);
        setBrokerage(profile.brokerage);
        setPhone(profile.phone);
        setEmail(profile.email);
        setHeadshotUrl(profile.headshot_url);
        setInstagram(profile.instagram || "");
        setLinkedin(profile.linkedin || "");
        setZillow(profile.zillow || "");
        setRealtorCom(profile.realtor_com || "");
        setFacebook(profile.facebook || "");
        setWebsite(profile.website || "");
        setWeeklyEmails(profile.weekly_emails !== false);
        setCalendlyUrl(profile.calendly_url || "");
        setAiApprovalMode(profile.ai_approval_mode === true);
      }
      setLoading(false);
    }
    fetchProfile();
  }, [supabase]);

  const handleHeadshotUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop();
      const timestamp = Date.now();
      const fileName = `${user.id}/headshot-${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("headshots")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("headshots").getPublicUrl(fileName);

      setHeadshotUrl(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      // Save via server-side API to ensure proper auth handling
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          title,
          brokerage,
          phone,
          email,
          headshot_url: headshotUrl || null,
          instagram,
          linkedin,
          zillow,
          realtor_com: realtorCom,
          facebook,
          website,
          weekly_emails: weeklyEmails,
          calendly_url: calendlyUrl,
          ai_approval_mode: aiApprovalMode,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to save settings");
      }

      // Re-fetch profile from DB to confirm changes persisted
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: refreshed } = await supabase
          .from("agent_profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (refreshed) {
          const p = refreshed as AgentProfile;
          setName(p.name);
          setTitle(p.title);
          setBrokerage(p.brokerage);
          setPhone(p.phone);
          setEmail(p.email);
          setHeadshotUrl(p.headshot_url);
          setInstagram(p.instagram || "");
          setLinkedin(p.linkedin || "");
          setZillow(p.zillow || "");
          setRealtorCom(p.realtor_com || "");
          setFacebook(p.facebook || "");
          setWebsite(p.website || "");
          setWeeklyEmails(p.weekly_emails !== false);
          setCalendlyUrl(p.calendly_url || "");
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div>
        <h1 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-gray-500">
          Your profile appears on all your listing pages.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="mt-8 space-y-8">
        {/* Headshot */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-gray-900">
            Profile Photo
          </h2>
          <div className="mt-4 flex items-center gap-6">
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100">
              {headshotUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={headshotUrl}
                  alt="Headshot"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-gray-300">
                  {name ? name[0].toUpperCase() : "?"}
                </div>
              )}
            </div>
            <div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                {uploadingPhoto ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleHeadshotUpload}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
              </label>
              <p className="mt-2 text-xs text-gray-400">
                Square image recommended. JPG or PNG, max 5MB.
              </p>
            </div>
          </div>
        </section>

        {/* Profile info */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-gray-900">
            Agent Information
          </h2>
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="Victoria Ashworth"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="Luxury Property Specialist"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Brokerage
              </label>
              <input
                type="text"
                value={brokerage}
                onChange={(e) => setBrokerage(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="Westside Luxury Realty"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formatPhone(phone)}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="310-555-0192"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="victoria@westsideluxury.com"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Social & Web Links */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-gray-900">
            Social & Web Links
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            These appear on your listing pages so buyers can connect with you.
          </p>
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Instagram
                </label>
                <input
                  type="url"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="https://instagram.com/yourhandle"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  LinkedIn
                </label>
                <input
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Zillow Profile
                </label>
                <input
                  type="url"
                  value={zillow}
                  onChange={(e) => setZillow(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="https://zillow.com/profile/yourname"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Realtor.com Profile
                </label>
                <input
                  type="url"
                  value={realtorCom}
                  onChange={(e) => setRealtorCom(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="https://realtor.com/realestateagents/yourname"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Facebook
                </label>
                <input
                  type="url"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="https://facebook.com/yourpage"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Website
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Scheduling */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-gray-900">Showing Scheduler</h2>
          <p className="mt-1 text-sm text-gray-500">
            Add your Calendly link so buyers can book showings directly from the AI chat on your listings.
          </p>
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Calendly URL
            </label>
            <input
              type="url"
              value={calendlyUrl}
              onChange={(e) => setCalendlyUrl(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              placeholder="https://calendly.com/your-name"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Don&apos;t have Calendly? <a href="https://calendly.com" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">Sign up free</a>. It takes 2 minutes.
            </p>
          </div>
        </section>

        {/* Integrations */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-gray-900">Integrations</h2>
          <p className="mt-1 text-sm text-gray-500">
            Connect external tools to level up your workflow.
          </p>
          <div className="mt-4">
            <GoogleCalendarConnect />
          </div>
        </section>

        {/* AI Automation */}
        <section className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50/40 to-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-gray-900">AI Automation</h2>
            {aiSavedAt && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <CheckCircle className="h-3 w-3" />
                Saved
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Control how AI handles your leads on your behalf.
          </p>
          <div className="mt-4">
            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50">
              <div>
                <p className="font-medium text-gray-900">Approval Mode</p>
                <p className="mt-0.5 text-sm text-gray-500">
                  When ON: AI drafts replies but waits for you to review and send. When OFF: AI auto-sends replies to new leads within seconds (recommended for max response speed).
                </p>
              </div>
              <div className="relative mt-1 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={aiApprovalMode}
                  onChange={(e) => toggleAiApproval(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-brand-500" />
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            Saves instantly. Also toggleable from the dashboard.
          </p>
        </section>

        {/* Notifications */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-gray-900">Notifications</h2>
          <p className="mt-1 text-sm text-gray-500">
            Alert when a new lead, showing, or reply comes in while you&apos;re logged in.
          </p>
          <div className="mt-4">
            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50">
              <div>
                <p className="font-medium text-gray-900">Sound alerts</p>
                <p className="mt-0.5 text-sm text-gray-500">
                  Play a short sound when a new lead, showing, or buyer reply comes in.
                </p>
              </div>
              <div className="relative mt-1 flex-shrink-0">
                <input
                  type="checkbox"
                  defaultChecked={typeof window !== "undefined" ? localStorage.getItem("lf_sound_alerts_enabled") !== "false" : true}
                  onChange={(e) => {
                    if (typeof window !== "undefined") {
                      localStorage.setItem("lf_sound_alerts_enabled", e.target.checked ? "true" : "false");
                    }
                  }}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-brand-500" />
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          </div>
        </section>

        {/* Email Preferences */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-gray-900">Email Preferences</h2>
          <div className="mt-4">
            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50">
              <div>
                <p className="font-medium text-gray-900">Weekly Performance Report</p>
                <p className="mt-0.5 text-sm text-gray-500">
                  Receive a summary every Monday with views, leads, and top-performing listings.
                </p>
              </div>
              <div className="relative ml-4 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={weeklyEmails}
                  onChange={(e) => setWeeklyEmails(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-brand-500" />
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          </div>
        </section>

        {/* Save button */}
        <div className="flex justify-end pb-10">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-gray-950 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : null}
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
