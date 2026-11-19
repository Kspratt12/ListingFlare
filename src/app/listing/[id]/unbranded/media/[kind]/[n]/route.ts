import { NextRequest, NextResponse } from "next/server";
import { NON_PUBLIC_STATUSES } from "@/lib/listingAiContext";
import { isAgentInactive } from "@/lib/listingVisibility";
import { isOwnStorageUrl } from "@/lib/unbrandedMedia";
import { sanitizeFloorPlan } from "@/lib/floorPlan";
import { SITE_AGENT_HEADER, siteAgentFor } from "@/lib/customDomain";
import { getAdminClient, getListingRow, getPublicAgent } from "../../../../listingData";

export const dynamic = "force-dynamic";

const notFound = () => new NextResponse("Not found", { status: 404, headers: { "cache-control": "no-store" } });

// Serves a listing photo or floor-plan image for the unbranded page without revealing its storage
// address (which contains the agent's account id). Same visibility rules as the unbranded page.
export async function GET(req: NextRequest, { params }: { params: { id: string; kind: string; n: string } }) {
  const index = Number(params.n);
  if (!Number.isInteger(index) || index < 0 || index > 200) return notFound();
  if (params.kind !== "photo" && params.kind !== "floorplan") return notFound();

  const listing = (await getListingRow(params.id)) as { id: string; agent_id: string; status: string; photos?: Array<{ src: string }> } | null;
  if (!listing || NON_PUBLIC_STATUSES.has(listing.status)) return notFound();
  const siteAgent = siteAgentFor(req.headers.get("host"), req.headers.get(SITE_AGENT_HEADER));
  if (siteAgent && listing.agent_id !== siteAgent) return notFound();
  const agent = await getPublicAgent(listing.agent_id);
  if (!agent || isAgentInactive(agent)) return notFound();

  let src: string | undefined;
  if (params.kind === "photo") {
    src = listing.photos?.[index]?.src;
  } else {
    const { data } = await getAdminClient().from("listings").select("floor_plan").eq("id", listing.id).maybeSingle();
    src = sanitizeFloorPlan((data as { floor_plan?: unknown } | null)?.floor_plan)?.image.src;
  }
  if (!isOwnStorageUrl(src, process.env.NEXT_PUBLIC_SUPABASE_URL)) return notFound();

  let upstream: Response;
  try {
    upstream = await fetch(src, { cache: "no-store" });
  } catch {
    return new NextResponse("Unavailable", { status: 502 });
  }
  const type = upstream.headers.get("content-type") || "";
  if (!upstream.ok || !/^image\/(jpeg|png|webp|gif|avif|heic|heif)$/i.test(type.split(";")[0].trim())) return notFound();
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
