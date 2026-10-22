// One slug rule shared by the sitemap and the /homes/[city] page so the two
// always agree. "Fuquay-Varina" and "Fuquay Varina" both become "fuquay-varina",
// and matching compares slugs instead of rebuilding the city name from the URL.
export function slugifyCity(city: string): string {
  return city
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// City pages with fewer listings than this are thin content: they stay
// reachable but are noindex'd and left out of the sitemap.
export const MIN_LISTINGS_TO_INDEX = 3;
