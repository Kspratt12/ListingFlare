// Stripe webhook processing with every Stripe and database call injected, so tests run with fakes.
//
// Design (each rule exists because of a failure mode in the previous inline handler):
//   * The agent profile is found by the stored Stripe subscription id first. Metadata (supabase_user_id)
//     is used only to link a subscription the profile does not know yet (checkout completion).
//   * Events about other products in a shared Stripe account are ignored: a subscription must contain the
//     configured ListingFlare price. If no price is configured, nothing is ignored (fail open to the old behavior).
//   * A stale event about an OLD subscription cannot change a NEWER one: updates and deletions are applied
//     only when the profile's stored subscription id equals the event's subscription id.
//   * Status comes from the subscription's CURRENT state retrieved from Stripe (not the event payload), so a
//     late-arriving older event cannot regress a newer status. Replays are harmless: every write sets absolute values.
//   * Checkout completion does NOT assume "active": the status is the subscription's own status (trialing, active,
//     incomplete for delayed payment methods, ...). A legitimate Stripe trial stays "trialing"; a delayed payment
//     stays "unpaid" until Stripe reports it active.
//   * A database error is a 500 so Stripe retries; previously the error was ignored and Stripe got a 200.
//   * A second checkout completing while the profile already holds a different live subscription is NOT applied
//     automatically (two subscriptions would be billed): it is logged loudly for the owner to resolve. No refund or
//     cancellation is ever performed here.

export type LocalStatus = "trialing" | "active" | "past_due" | "canceled" | "unpaid";

export function mapStripeStatus(status: string): LocalStatus {
  switch (status) {
    case "trialing": return "trialing";
    case "active": return "active";
    case "past_due": return "past_due";
    case "canceled": return "canceled";
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
    default:
      return "unpaid";
  }
}

export interface SubscriptionView {
  id: string;
  status: string;
  customerId: string | null;
  priceIds: string[];
  userIdMeta: string | null;
}

export interface ProfileView {
  id: string;
  stripeSubscriptionId: string | null;
  status: string | null;
}

export interface WebhookDeps {
  configuredPriceId: string | null;
  retrieveSubscription(id: string): Promise<SubscriptionView | null>; // null = no such subscription
  findProfileBySubscription(subId: string): Promise<{ profile: ProfileView | null; error: boolean }>;
  findProfileById(userId: string): Promise<{ profile: ProfileView | null; error: boolean }>;
  // Applies fields to ONE profile; when onlyIfSubscriptionId is given the update matches only if the stored id equals it.
  updateProfile(userId: string, fields: Record<string, unknown>, onlyIfSubscriptionId?: string | null): Promise<{ error: boolean; rows: number }>;
  // Optional checkout-reservation bookkeeping (migration 042). Failures are logged, never fail the webhook: the lease heals state.
  // Returns false when the paid session is not a recorded attempt (an orphan).
  markCheckoutCompleted?(sessionId: string, subscriptionId: string): Promise<boolean | void>;
  markCheckoutExpired?(sessionId: string): Promise<void>;
  log(level: "info" | "warn" | "error", message: string, detail?: Record<string, unknown>): void;
}

export interface WebhookEventView {
  id: string;
  type: string;
  object: Record<string, unknown>;
}

export interface WebhookOutcome { status: number; body: Record<string, unknown> }

const OK = (extra: Record<string, unknown> = {}): WebhookOutcome => ({ status: 200, body: { received: true, ...extra } });
const RETRY = (reason: string): WebhookOutcome => ({ status: 500, body: { error: "Webhook handler failed", reason } });

// Three cases, kept distinct:
//   "ours"      - the configured ListingFlare price (or no price configured: old behaviour).
//   "unrelated" - another product in the shared Stripe account (no ListingFlare marker): ignored silently.
//   "unknown"   - carries ListingFlare's own marker (metadata.supabase_user_id, set only by our checkout) but not the configured
//                 price: possibly a second legitimate ListingFlare price or a misconfiguration. NEVER applied and NEVER silent:
//                 logged at error level for the owner to investigate. No additional plans are assumed.
export type PriceClass = "ours" | "unrelated" | "unknown";
function classify(deps: WebhookDeps, sub: SubscriptionView): PriceClass {
  if (!deps.configuredPriceId || sub.priceIds.includes(deps.configuredPriceId)) return "ours";
  return sub.userIdMeta ? "unknown" : "unrelated";
}
function notOurs(deps: WebhookDeps, sub: SubscriptionView, eventId: string): WebhookOutcome | null {
  const c = classify(deps, sub);
  if (c === "ours") return null;
  if (c === "unknown") {
    deps.log("error", "UNRECOGNISED PRICE on a ListingFlare-linked subscription: not applied; investigate (possible duplicate or second plan).", { eventId, subscriptionId: sub.id, priceIds: sub.priceIds });
    return OK({ ignored: "unknown_price" });
  }
  return OK({ ignored: "other_product" });
}

async function markCompleted(deps: WebhookDeps, sessionId: string | undefined, subscriptionId: string) {
  if (!sessionId || !deps.markCheckoutCompleted) return;
  try {
    const recorded = await deps.markCheckoutCompleted(sessionId, subscriptionId);
    if (recorded === false) deps.log("error", "ORPHAN CHECKOUT PAID: the completed session was not a recorded checkout attempt (created by a request that lost its reservation). Check for a duplicate subscription.", { sessionId, subscriptionId });
  } catch { deps.log("warn", "Could not mark a checkout attempt completed", { subscriptionId }); }
}

export async function processStripeEvent(event: WebhookEventView, deps: WebhookDeps): Promise<WebhookOutcome> {
  const o = event.object as { id?: string; subscription?: string | null; mode?: string; customer?: string | null; metadata?: Record<string, string> | null; parent?: { subscription_details?: { subscription?: unknown } } };

  switch (event.type) {
    case "checkout.session.completed": {
      const subId = typeof o.subscription === "string" ? o.subscription : null;
      if (o.mode !== "subscription" || !subId) return OK({ ignored: "not_a_subscription_checkout" });
      const sub = await deps.retrieveSubscription(subId);
      if (!sub) return OK({ ignored: "subscription_not_found" });
      const skip = notOurs(deps, sub, event.id);
      if (skip) return skip;
      const userId = sub.userIdMeta || o.metadata?.supabase_user_id || null;
      if (!userId) { deps.log("warn", "Checkout completed without a supabase_user_id", { eventId: event.id, subscriptionId: sub.id }); return OK({ ignored: "no_user" }); }
      const found = await deps.findProfileById(userId);
      if (found.error) return RETRY("profile_lookup");
      if (!found.profile) { deps.log("warn", "Checkout for an unknown profile", { eventId: event.id, subscriptionId: sub.id }); return OK({ ignored: "unknown_profile" }); }
      const existing = found.profile;
      let existingIsLive = false;
      if (existing.stripeSubscriptionId && existing.stripeSubscriptionId !== sub.id) {
        // The stored subscription must be confirmed LIVE in Stripe; a stale (ended or missing) one does not block the new one.
        const current = await deps.retrieveSubscription(existing.stripeSubscriptionId); // throws on transient failure => retry, no write
        existingIsLive = !!current && current.status !== "canceled" && current.status !== "incomplete_expired";
      }
      if (existingIsLive) {
        deps.log("error", "DUPLICATE SUBSCRIPTION: profile already has a live subscription; the new one was NOT applied. Owner action needed (no automatic refund or cancel).", { userId, keptSubscriptionId: existing.stripeSubscriptionId, newSubscriptionId: sub.id, eventId: event.id });
        await markCompleted(deps, o.id, sub.id);
        return OK({ ignored: "duplicate_subscription" });
      }
      const status = mapStripeStatus(sub.status);
      const res = await deps.updateProfile(userId, {
        stripe_customer_id: sub.customerId || (typeof o.customer === "string" ? o.customer : null),
        stripe_subscription_id: sub.id,
        subscription_status: status,
        setup_fee_paid: status === "active" || status === "trialing",
      });
      if (res.error) return RETRY("profile_update");
      await markCompleted(deps, o.id, sub.id);
      return OK({ applied: status });
    }

    case "customer.subscription.updated":
    case "invoice.payment_failed": {
      const subId = event.type === "invoice.payment_failed"
        ? (typeof o.parent?.subscription_details?.subscription === "string" ? o.parent.subscription_details.subscription : null)
        : (o.id || null);
      if (!subId) return OK({ ignored: "no_subscription" });
      const sub = await deps.retrieveSubscription(subId); // current state, not the (possibly stale) payload
      if (!sub) return OK({ ignored: "subscription_not_found" });
      const skip = notOurs(deps, sub, event.id);
      if (skip) return skip;
      const byStored = await deps.findProfileBySubscription(sub.id);
      if (byStored.error) return RETRY("profile_lookup");
      let userId = byStored.profile?.id || null;
      if (!userId && sub.userIdMeta) {
        // The profile does not know this subscription yet (updated event before checkout completion). Link only if it has none.
        const byId = await deps.findProfileById(sub.userIdMeta);
        if (byId.error) return RETRY("profile_lookup");
        if (byId.profile && !byId.profile.stripeSubscriptionId) userId = byId.profile.id;
      }
      if (!userId) return OK({ ignored: "no_matching_profile" });
      // A subscription that ended without a 'deleted' event (for example incomplete_expired) must free the profile for a new checkout.
      const ended = sub.status === "canceled" || sub.status === "incomplete_expired";
      const fields: Record<string, unknown> = ended && byStored.profile
        ? { subscription_status: "canceled", stripe_subscription_id: null }
        : { subscription_status: mapStripeStatus(sub.status) };
      const res = await deps.updateProfile(userId, fields, byStored.profile ? sub.id : null);
      if (res.error) return RETRY("profile_update");
      return OK({ applied: fields.subscription_status });
    }

    case "customer.subscription.deleted": {
      const subId = o.id || null;
      if (!subId) return OK({ ignored: "no_subscription" });
      const sub = await deps.retrieveSubscription(subId);
      if (sub) { const skip = notOurs(deps, sub, event.id); if (skip) return skip; }
      const byStored = await deps.findProfileBySubscription(subId);
      if (byStored.error) return RETRY("profile_lookup");
      if (!byStored.profile) return OK({ ignored: "no_matching_profile" }); // an old/other subscription: never touch a newer one
      const res = await deps.updateProfile(byStored.profile.id, { subscription_status: "canceled", stripe_subscription_id: null }, subId);
      if (res.error) return RETRY("profile_update");
      return OK({ applied: "canceled" });
    }

    case "checkout.session.expired": {
      if (typeof o.id === "string" && deps.markCheckoutExpired) {
        try { await deps.markCheckoutExpired(o.id); } catch { deps.log("warn", "Could not mark a checkout attempt expired", { eventId: event.id }); }
      }
      return OK({ applied: "checkout_expired" });
    }

    default:
      return OK({ ignored: "unhandled_type" });
  }
}
