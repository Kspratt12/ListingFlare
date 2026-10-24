import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getAllPosts } from "@/lib/blog";
import { isAgentInactive, firstRelation } from "@/lib/listingVisibility";
import { slugifyCity, MIN_LISTINGS_TO_INDEX } from "@/lib/cities";

// Regenerate hourly so new listings reach Googlebot without a redeploy.
export const revalidate = 3600;

const baseUrl = "https://www.listingflare.com";

// Static pages only change on deploy, so give them a fixed date instead of
// "now" (which tells Google every page changed on every crawl).
const STATIC_LAST_MODIFIED = new Date("2026-10-01");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/demo`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/pricing`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/single-property-website-builder`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/real-estate-lead-capture-software`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/real-estate-ai-chatbot`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/listingflare-vs-rela`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/listingflare-vs-singlepropertysites`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.6 },
  ];

  // Blog posts live in src/content/articles, not Supabase.
  for (const post of getAllPosts()) {
    if (post.noindex) continue;
    entries.push({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updated || post.date),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  // Published listings and the city pages derived from them.
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: listings } = await db
      .from("listings")
      .select("slug, id, updated_at, city, state, agent:agent_profiles(subscription_status, trial_ends_at)")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(5000);

    const cityLastModified = new Map<string, Date>();
    const cityCounts = new Map<string, number>();

    for (const listing of listings || []) {
      if (isAgentInactive(firstRelation(listing.agent as never))) continue;
      const modified = new Date(listing.updated_at || STATIC_LAST_MODIFIED);
      entries.push({
        url: `${baseUrl}/listing/${listing.slug || listing.id}`,
        lastModified: modified,
        changeFrequency: "weekly",
        priority: 0.8,
      });

      if (listing.city && listing.state) {
        const citySlug = `${slugifyCity(listing.city)}-${listing.state.toLowerCase()}`;
        cityCounts.set(citySlug, (cityCounts.get(citySlug) || 0) + 1);
        const seen = cityLastModified.get(citySlug);
        if (!seen || modified > seen) cityLastModified.set(citySlug, modified);
      }
    }

    // Thin city pages (fewer than MIN_LISTINGS_TO_INDEX) are noindex, so they
    // stay out of the sitemap too.
    cityLastModified.forEach((lastModified, citySlug) => {
      if ((cityCounts.get(citySlug) || 0) < MIN_LISTINGS_TO_INDEX) return;
      entries.push({
        url: `${baseUrl}/homes/${citySlug}`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    });
  } catch {
    // Sitemap still works without listings
  }

  return entries;
}
