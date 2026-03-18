import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Listing, AgentProfile } from "@/lib/types";
import type { Metadata } from "next";
import ListingPageClient from "./ListingPageClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const isUUIDFormat = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const db = getAdminClient();

  let data;
  if (isUUIDFormat(params.id)) {
    const res = await db.from("listings").select("street, city, state, price").eq("id", params.id).single();
    data = res.data;
  }
  if (!data) {
    const res = await db.from("listings").select("street, city, state, price").eq("slug", params.id).single();
    data = res.data;
  }

  if (!data) return { title: "Listing Not Found" };

  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(data.price);

  return {
    title: `${data.street} — ${price} | ListingFlare`,
    description: `${data.street}, ${data.city}, ${data.state}. Listed at ${price}.`,
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
  // Admin client for ALL database queries — bypasses RLS for anonymous visitors
  const db = getAdminClient();

  // Auth client only for checking if current user is the owner
  const supabase = createServerSupabaseClient();

  // Fetch listing — try UUID first, then slug
  let listing;
  if (isUUIDFormat(params.id)) {
    const { data } = await db.from("listings").select("*").eq("id", params.id).single();
    listing = data;
  }
  if (!listing) {
    const { data } = await db.from("listings").select("*").eq("slug", params.id).single();
    listing = data;
  }

  if (!listing) notFound();
  if (listing.status === "draft" || listing.status === "archived") notFound();

  const typedListing = listing as Listing;

  // Fetch agent profile — also using admin client
  const { data: agent } = await db
    .from("agent_profiles")
    .select("*")
    .eq("id", typedListing.agent_id)
    .single();

  if (!agent) notFound();

  const typedAgent = agent as AgentProfile;

  // Check subscription status
  const isTrialing = typedAgent.subscription_status === "trialing";
  const isPaid = typedAgent.subscription_status === "active";
  const trialEnd = new Date(typedAgent.trial_ends_at);
  const isExpired = isTrialing && trialEnd < new Date();

  // Check if the current user is the listing owner
  let isOwner = false;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    isOwner = !!user && user.id === typedListing.agent_id;
  } catch {
    isOwner = false;
  }

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

  // Increment view count — only for non-owners
  if (!isOwner) {
    await db
      .from("listings")
      .update({ view_count: (typedListing.view_count || 0) + 1 })
      .eq("id", typedListing.id);
  }

  return (
    <ListingPageClient listing={typedListing} agent={typedAgent} isOwner={isOwner} />
  );
}
