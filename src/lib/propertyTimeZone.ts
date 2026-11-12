import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidTimeZone } from "./timezone";

// Effective time zone of a property: the listing's own zone if set, else its agent's
// default, else null. Never derived from the server or the browser. If the columns do
// not exist yet (migration not applied) both reads error and the result is null, so
// code deployed ahead of the migration behaves like "no zone known".
export async function getPropertyTimeZone(db: SupabaseClient, listingId: string, agentId: string): Promise<string | null> {
  const l = await db.from("listings").select("timezone").eq("id", listingId).maybeSingle();
  if (!l.error && isValidTimeZone(l.data?.timezone)) return l.data!.timezone as string;
  const a = await db.from("agent_profiles").select("timezone").eq("id", agentId).maybeSingle();
  if (!a.error && isValidTimeZone(a.data?.timezone)) return a.data!.timezone as string;
  return null;
}
