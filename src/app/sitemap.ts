import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getAllPosts } from "@/lib/blog";

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
    { url: `${baseUrl}/signup`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/blog`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.6 },
  ];

  // Blog posts live in src/content/articles, not Supabase.
  for (const post of getAllPosts()) {
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
      .select("slug, id, updated_at, city, state")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(5000);

    const cityLastModified = new Map<string, Date>();

    for (const listing of listings || []) {
      const modified = new Date(listing.updated_at || STATIC_LAST_MODIFIED);
      entries.push({
        url: `${baseUrl}/listing/${listing.slug || listing.id}`,
        lastModified: modified,
        changeFrequency: "weekly",
        priority: 0.8,
      });

      if (listing.city && listing.state) {
        const citySlug = `${listing.city.toLowerCase().replace(/\s+/g, "-")}-${listing.state.toLowerCase()}`;
        const seen = cityLastModified.get(citySlug);
        if (!seen || modified > seen) cityLastModified.set(citySlug, modified);
      }
    }

    cityLastModified.forEach((lastModified, citySlug) => {
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
