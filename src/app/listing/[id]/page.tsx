import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Listing, AgentProfile } from "@/lib/types";
import type { Metadata } from "next";
import ListingPageClient from "./ListingPageClient";

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

  // Increment view count (fire-and-forget)
  supabase.rpc("increment_view_count", { listing_uuid: params.id });

  return (
    <ListingPageClient listing={typedListing} agent={typedAgent} />
  );
}
