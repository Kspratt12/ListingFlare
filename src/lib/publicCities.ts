import { createClient } from "@supabase/supabase-js";
import { slugifyCity, MIN_LISTINGS_TO_INDEX } from "@/lib/cities";
import { isAgentInactive, firstRelation } from "@/lib/listingVisibility";
import { isDemoAgentId } from "@/lib/demoAgents";

export interface CityRow {
  slug: string;
  name: string;
  state: string;
  count: number;
}

// Cities that appear in the public "Homes by City" directory.
//
// A listing counts when its owner has published it, the owner's trial has not lapsed,
// and the owner is not a demo/admin account (those stay private). Same rule as the
// city pages and the sitemap: thin cities are left out.
export async function getPublicCities(): Promise<CityRow[]> {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await db
      .from("listings")
      .select("city, state, agent_id, agent:agent_profiles(subscription_status, trial_ends_at)")
      .eq("status", "published")
      .limit(5000);
    const map = new Map<string, CityRow>();
    for (const l of data || []) {
      if (!l.city || !l.state) continue;
      if (isAgentInactive(firstRelation(l.agent as never))) continue;
      if (isDemoAgentId(l.agent_id as string | null)) continue;
      const slug = `${slugifyCity(l.city)}-${String(l.state).toLowerCase()}`;
      const row = map.get(slug);
      if (row) row.count += 1;
      else map.set(slug, { slug, name: l.city as string, state: String(l.state).toUpperCase(), count: 1 });
    }
    return Array.from(map.values())
      .filter((c) => c.count >= MIN_LISTINGS_TO_INDEX)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
