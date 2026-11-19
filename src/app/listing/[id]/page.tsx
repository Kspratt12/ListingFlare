import { factsLine } from "@/lib/listingFacts";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PUBLIC_AGENT_COLUMNS, type Listing, type PublicAgentProfile } from "@/lib/types";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import ListingPageClient from "./ListingPageClient";
import { isAgentInactive } from "@/lib/listingVisibility";
import { isDemoAgentId } from "@/lib/demoAgents";
import { NON_PUBLIC_STATUSES } from "@/lib/listingAiContext";
import { agentProfilePath, type SiteListing } from "@/lib/agentSite";
import { SITE_AGENT_HEADER, siteAgentFor } from "@/lib/customDomain";
import { agentShowsOtherListings, getAdminClient, getListingRow, loadFloorPlan, loadOtherListings } from "./listingData";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface Props {
  params: { id: string };
}

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
  // Drafts and archived listings are only ever seen by their owner as a private preview.
  if (NON_PUBLIC_STATUSES.has(data.status)) {
    return { title: `Preview: ${data.street || "Untitled listing"}`, robots: { index: false, follow: false } };
  }

  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(data.price);

  const title = `${data.street} - ${price}`;
  const facts = factsLine(data, ", ");
  const description = `${data.street}, ${data.city}, ${data.state}. ${facts ? facts + ". " : ""}Listed at ${price}. See photos, details and request a showing.`;
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
  // Sample listings from demo accounts are shown to visitors but kept out of Google.
  if (isDemoAgentId(data.agent_id)) inactive = true;
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

function PreviewBanner({ listingId, status }: { listingId: string; status: string }) {
  return (
    <div className="fixed left-0 right-0 top-0 z-50 bg-amber-500 text-gray-950">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-2.5 text-sm">
        <span>
          <strong>Private preview.</strong> This listing is {status === "archived" ? "archived" : "a draft"}: only you can see
          this page. Visitors get &ldquo;not found&rdquo; until you publish.
        </span>
        <Link
          href={`/dashboard/edit/${listingId}`}
          className="rounded-full bg-gray-950 px-4 py-1 text-xs font-semibold text-white hover:bg-gray-800"
        >
          Back to editing
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
  // On a customer's own domain only that agent's listings exist.
  const siteAgent = siteAgentFor(headers().get("host"), headers().get(SITE_AGENT_HEADER));
  if (siteAgent && listing.agent_id !== siteAgent) notFound();
  const isNonPublic = NON_PUBLIC_STATUSES.has(listing.status);
  // Anonymous visitors never see drafts or archived listings.
  if (isNonPublic && !hasAuthCookie) notFound();

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
    !hasAuthCookie && !isBot && !isNonPublic ? countView() : Promise.resolve(),
  ]);

  const agent = agentRes.data;
  if (!agent) notFound();

  const typedAgent = agent as unknown as PublicAgentProfile;

  const isOwner = !!signedInUserId && signedInUserId === typedListing.agent_id;

  // Drafts / archived: the owner gets a private preview; everyone else gets not-found.
  if (isNonPublic && !isOwner) notFound();
  const floorPlan = await loadFloorPlan(typedListing.id, (typedListing.photos || []).map((p) => p.src));
  if (isNonPublic) {
    return (
      <div>
        <PreviewBanner listingId={typedListing.id} status={typedListing.status} />
        <div className="pt-12">
          <ListingPageClient listing={typedListing} agent={typedAgent} isOwner floorPlan={floorPlan} />
        </div>
      </div>
    );
  }

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
            <ListingPageClient listing={typedListing} agent={typedAgent} isOwner={isOwner} floorPlan={floorPlan} />
          </div>
        </div>
      );
    }
    return <InactiveListingPage />;
  }

  // Optional "More listings from this agent" (agent opt-in, this agent's active listings only).
  let otherListings: SiteListing[] = [];
  if (await agentShowsOtherListings(typedAgent.id)) {
    otherListings = await loadOtherListings(typedAgent.id, typedListing.id);
  }

  return (
    <ListingPageClient
      listing={typedListing}
      agent={typedAgent}
      isOwner={isOwner}
      otherListings={otherListings}
      agentProfileHref={siteAgent ? "/" : agentProfilePath(typedAgent)}
      floorPlan={floorPlan}
    />
  );
}
