import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { PUBLIC_AGENT_COLUMNS, type Listing, type PublicAgentProfile } from "@/lib/types";
import type { Metadata } from "next";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import ListingPageClient from "./ListingPageClient";
import { isAgentInactive } from "@/lib/listingVisibility";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface Props {
  params: { id: string };
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        fetch: (url: string | URL | Request, init?: RequestInit) =>
          fetch(url, { ...init, cache: "no-store" }),
      },
    }
  );
}

// Everything the public listing page renders. Deliberately excludes
// updated_at and anything not shown to visitors.
const LISTING_PAGE_COLUMNS =
  "id, agent_id, status, launch_date, video_intro_url, brand_color, slug, street, city, state, zip, price, beds, baths, sqft, year_built, lot_size, description, features, photos, videos, virtual_tour_url, view_count, created_at, price_history, mls_id, county, subdivision, architectural_style, property_subtype, stories, parking_spaces, property_tax_annual, hoa_required, hoa_fee_monthly, heating_type, cooling_type, water_source, sewer_type, roof_type, construction_material, foundation_type, appliances_included, school_elementary, school_middle, school_high, parcel_number, fireplace_count, laundry_location, basement_type, published_at, ai_chat_enabled, comparable_sales, co_agent_name, co_agent_title, co_agent_brokerage, co_agent_license, co_agent_phone, co_agent_email, co_agent_headshot_url";

const isUUIDFormat = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// One lookup per request, shared by generateMetadata and the page itself
// (React cache() dedupes it), instead of each running its own queries.
// UUID links try the id first and fall back to the slug.
const getListingRow = cache(async (idOrSlug: string) => {
  const db = getAdminClient();
  if (isUUIDFormat(idOrSlug)) {
    const { data } = await db.from("listings").select(LISTING_PAGE_COLUMNS).eq("id", idOrSlug).single();
    if (data) return data;
  }
  const { data } = await db.from("listings").select(LISTING_PAGE_COLUMNS).eq("slug", idOrSlug).single();
  return data;
});

// Crawlers and link-preview fetchers shouldn't inflate a listing's view count
const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|lighthouse|headless|monitor/i;

async function getSignedInUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await createServerSupabaseClient().auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getListingRow(params.id);
  const slug = data?.slug || params.id;

  if (!data) return { title: "Listing Not Found" };

  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(data.price);

  const title = `${data.street} - ${price}`;
  const description = `${data.street}, ${data.city}, ${data.state}. ${data.beds} bed, ${data.baths} bath, ${data.sqft?.toLocaleString() || ""} sqft. Listed at ${price}. See photos, details and request a showing.`;
  let inactive = false;
  try {
    const { data: agentRow } = await getAdminClient()
      .from("agent_profiles")
      .select("subscription_status, trial_ends_at")
      .eq("id", data.agent_id)
      .single();
    inactive = isAgentInactive(agentRow);
  } catch {
    // metadata still renders without the check
  }
  const heroImage = data.photos?.[0]?.src || undefined;
  const url = `https://www.listingflare.com/listing/${slug}`;

  return {
    title,
    description,
    ...(inactive ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      ...(heroImage ? { images: [{ url: heroImage, width: 1200, height: 630, alt: data.street }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(heroImage ? { images: [heroImage] } : {}),
    },
  };
}

function InactiveListingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-200">
          <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 10-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="mt-6 font-serif text-2xl font-bold text-gray-900">
          This listing is currently inactive
        </h1>
        <p className="mt-3 text-gray-500">
          This property page is temporarily unavailable. Please contact the listing agent for more information.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center rounded-full bg-gray-950 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
        >
          Visit ListingFlare
        </Link>
      </div>
    </div>
  );
}

export default async function ListingPage({ params }: Props) {
  // Admin client for ALL database queries - bypasses RLS for anonymous visitors
  const db = getAdminClient();

  // Visitors with no Supabase auth cookie can't be the owner, so the auth
  // round-trip is skipped for them. Signed-in visitors start it right away,
  // in parallel with the listing lookup.
  const hasAuthCookie = cookies().getAll().some((c) => c.name.startsWith("sb-"));
  const isBot = BOT_UA.test(headers().get("user-agent") || "");
  const userIdPromise = hasAuthCookie ? getSignedInUserId() : Promise.resolve<string | null>(null);

  const listing = await getListingRow(params.id);

  if (!listing) notFound();
  if (listing.status === "draft" || listing.status === "archived") notFound();

  const typedListing = listing as unknown as Listing;

  // Increment view count atomically using SQL to prevent race conditions
  const countView = async () => {
    const { error: rpcError } = await db.rpc("increment_view_count", { listing_id: typedListing.id });
    if (rpcError) {
      // Fallback if RPC doesn't exist yet
      await db
        .from("listings")
        .update({ view_count: (typedListing.view_count || 0) + 1 })
        .eq("id", typedListing.id);
    }
  };

  // Agent profile, owner check and (for anonymous humans) the view count all
  // run at the same time instead of one after another.
  const [agentRes, signedInUserId] = await Promise.all([
    db
      .from("agent_profiles")
      .select(PUBLIC_AGENT_COLUMNS)
      .eq("id", typedListing.agent_id)
      .single(),
    userIdPromise,
    !hasAuthCookie && !isBot ? countView() : Promise.resolve(),
  ]);

  const agent = agentRes.data;
  if (!agent) notFound();

  const typedAgent = agent as unknown as PublicAgentProfile;

  const isOwner = !!signedInUserId && signedInUserId === typedListing.agent_id;

  // Signed-in visitors: count the view only once we know they aren't the owner
  if (hasAuthCookie && !isOwner && !isBot) {
    await countView();
  }

  // Check subscription status
  const isTrialing = typedAgent.subscription_status === "trialing";
  const isPaid = typedAgent.subscription_status === "active";
  const trialEnd = new Date(typedAgent.trial_ends_at);
  const isExpired = isTrialing && trialEnd < new Date();

  // If expired and not paid, show inactive page
  if (isExpired && !isPaid) {
    if (isOwner) {
      return (
        <div>
          <div className="fixed left-0 right-0 top-0 z-50 bg-red-600 text-white">
            <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-3 text-sm">
              <span>Your trial has expired. This listing is hidden from visitors.</span>
              <Link
                href="/dashboard/billing"
                className="rounded-full bg-white px-4 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Upgrade to Reactivate
              </Link>
            </div>
          </div>
          <div className="pt-12">
            <ListingPageClient listing={typedListing} agent={typedAgent} isOwner={isOwner} />
          </div>
        </div>
      );
    }
    return <InactiveListingPage />;
  }

  return (
    <ListingPageClient listing={typedListing} agent={typedAgent} isOwner={isOwner} />
  );
}
