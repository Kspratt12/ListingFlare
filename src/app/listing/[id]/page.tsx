import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Listing, AgentProfile } from "@/lib/types";
import type { Metadata } from "next";
import ListingPageClient from "./ListingPageClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("listings")
    .select("street, city, state, price")
    .eq("id", params.id)
    .eq("status", "published")
    .single();

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
  const supabase = createServerSupabaseClient();

  // Fetch listing
  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", params.id)
    .eq("status", "published")
    .single();

  if (!listing) notFound();

  const typedListing = listing as Listing;

  // Fetch agent profile
  const { data: agent } = await supabase
    .from("agent_profiles")
    .select("*")
    .eq("id", typedListing.agent_id)
    .single();

  if (!agent) notFound();

  const typedAgent = agent as AgentProfile;

  // Check subscription status — lock listing if trial expired and not paid
  const isTrialing = typedAgent.subscription_status === "trialing";
  const isPaid = typedAgent.subscription_status === "active";
  const trialEnd = new Date(typedAgent.trial_ends_at);
  const isExpired = isTrialing && trialEnd < new Date();

  // Check if the current user is the listing owner
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === typedListing.agent_id;

  // If expired and not paid, show inactive page (owners see it too with a message)
  if (isExpired && !isPaid) {
    if (isOwner) {
      // Owner sees the listing but with a banner to upgrade
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

  // Increment view count (fire-and-forget) — only for non-owners
  if (!isOwner) {
    supabase.rpc("increment_view_count", { listing_uuid: params.id });
  }

  return (
    <ListingPageClient listing={typedListing} agent={typedAgent} isOwner={isOwner} />
  );
}
