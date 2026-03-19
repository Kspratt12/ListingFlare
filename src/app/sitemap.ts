import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.listingflare.com";

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/demo`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  // Add all published listings to sitemap so Google indexes them
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: listings } = await db
      .from("listings")
      .select("slug, id, updated_at")
      .eq("status", "published");

    if (listings) {
      for (const listing of listings) {
        staticPages.push({
          url: `${baseUrl}/listing/${listing.slug || listing.id}`,
          lastModified: new Date(listing.updated_at || Date.now()),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // Sitemap still works without listings
  }

  return staticPages;
}
