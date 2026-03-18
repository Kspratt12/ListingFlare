export function generateSlug(street: string, city: string, id: string): string {
  const base = `${street} ${city}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  // Add first 8 chars of UUID for uniqueness
  const short = id.replace(/-/g, "").slice(0, 8);
  return base ? `${base}-${short}` : short;
}
