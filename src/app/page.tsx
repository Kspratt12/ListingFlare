import { createClient } from "@supabase/supabase-js";
import HomeClient from "./HomeClient";
import { getAllPosts } from "@/lib/blog";

// Rebuilt at most hourly. Photos are fetched here, on the server, so the
// landing page renders with its images already chosen (no client fetch
// delaying the hero image).
export const revalidate = 3600;

// Only hosts next/image is configured to optimize (see next.config.mjs).
// Anything else would throw at render time, so it is filtered out here.
const ALLOWED_PHOTO_HOSTS = new Set([
  "pvnsirpfofxklqgxwdiz.supabase.co",
  "images.unsplash.com",
]);

async function getLivePhotos(): Promise<string[]> {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    // Anon key: the "Public can view published listings" RLS policy applies
    const { data } = await db
      .from("listings")
      .select("photos")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(12);

    const urls: string[] = [];
    for (const row of data || []) {
      const src = (row.photos as { src?: string }[] | null)?.[0]?.src;
      if (!src) continue;
      try {
        if (ALLOWED_PHOTO_HOSTS.has(new URL(src).hostname)) urls.push(src);
      } catch {
        // not a valid absolute URL: skip it
      }
    }
    return urls;
  } catch {
    return [];
  }
}

export default async function Page() {
  const livePhotos = await getLivePhotos();
  const latestPosts = getAllPosts()
    .slice(0, 6)
    .map(({ slug, title, description, category, coverImage, coverImageAlt }) => ({
      slug,
      title,
      description,
      category,
      coverImage,
      coverImageAlt,
    }));
  return <HomeClient livePhotos={livePhotos} latestPosts={latestPosts} />;
}
