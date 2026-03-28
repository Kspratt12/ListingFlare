import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getAllPosts } from "@/lib/blog";

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
      url: `${baseUrl}/pricing`,
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
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  // Add all blog posts to sitemap
  const posts = getAllPosts();
  for (const post of posts) {
    staticPages.push({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updated || post.date),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  // Add all published listings to sitemap so Google indexes them
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: listings } = await db
      .from("listings")
      .select("slug, id, updated_at, city, state")
      .eq("status", "published");

    if (listings) {
      // Add individual listing pages
      for (const listing of listings) {
        staticPages.push({
          url: `${baseUrl}/listing/${listing.slug || listing.id}`,
          lastModified: new Date(listing.updated_at || Date.now()),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }

      // Add programmatic city pages (unique city/state combos)
      const cities = new Set<string>();
      for (const listing of listings) {
        if (listing.city && listing.state) {
          const slug = `${listing.city.toLowerCase().replace(/\s+/g, "-")}-${listing.state.toLowerCase()}`;
          cities.add(slug);
        }
      }
      for (const citySlug of Array.from(cities)) {
        staticPages.push({
          url: `${baseUrl}/homes/${citySlug}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  } catch {
    // Sitemap still works without listings
  }

  return staticPages;
}
