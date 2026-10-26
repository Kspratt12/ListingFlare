// Accounts that exist to demonstrate the product (sample listings, not homes
// anyone is actually selling through ListingFlare). Their pages keep working for
// demos and links, but stay out of Google's index and the sitemap so the site never
// presents sample homes as real "homes for sale".
//
// To mark more accounts as demos without a code change, set DEMO_AGENT_IDS in the
// environment to a comma-separated list of agent ids.
const BUILT_IN_DEMO_AGENT_IDS = ["8feda89a-66e0-4f8a-bfd8-527135cf6535"];

const DEMO_AGENT_IDS = new Set<string>([
  ...BUILT_IN_DEMO_AGENT_IDS,
  ...(process.env.DEMO_AGENT_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
]);

export function isDemoAgentId(id: string | null | undefined): boolean {
  return !!id && DEMO_AGENT_IDS.has(id);
}
