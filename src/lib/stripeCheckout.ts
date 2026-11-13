// Orchestration for POST /api/stripe/checkout, with every Supabase and Stripe call
// injected. The route file only builds the real dependencies and calls
// processCheckoutRequest(); tests call it with fakes (no Stripe, no database).
//
// Order of operations (nothing earlier in the list may depend on a later one):
//   1. verify the signed-in user                          - read only
//   2. load that user's profile                           - read only
//   3. reuse the saved Stripe customer, or create one     - Stripe write
//   4. save the new customer id on the user's own profile - database write, CONFIRMED
//   5. create the Checkout Session                        - Stripe write
//
// Step 5 only happens if step 4 is confirmed. "Confirmed" means the database
// reported no error AND exactly one row came back, and that row is the verified
// user's own profile. An error-free response that matched zero rows is a failure,
// because the customer id was not actually saved.
//
// Why fail closed: by step 4 the Stripe customer already exists, so continuing
// after a failed save would orphan it and create another on every retry. A save
// that keeps failing also points at a broken server-side database credential, which
// is the same access the Stripe webhook needs to activate a plan after payment.
// Better to stop at the first checkout than to take a payment we may not be able
// to apply.

export interface CheckoutUser {
  id: string;
  email?: string | null;
}

export interface CheckoutProfile {
  stripe_customer_id: string | null;
  email: string | null;
  name: string | null;
  // Optional so older callers and fixtures keep working. When present they block a second subscription.
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
}

export interface SaveCustomerResult {
  rows: Array<{ id: string }> | null;
  error: { code?: string } | null;
}

export interface CheckoutDeps {
  getUser(): Promise<CheckoutUser | null>;
  getProfile(userId: string): Promise<CheckoutProfile | null>;
  createCustomer(input: { userId: string; email?: string; name?: string }): Promise<{ id: string }>;
  // Must update ONLY the row whose id is userId and report which rows it changed.
  saveCustomerId(userId: string, customerId: string): Promise<SaveCustomerResult>;
  isPricingConfigured(): boolean;
  // Optional. Expires this customer's other OPEN Checkout Sessions so two sessions cannot both be paid (reduces, does not
  // eliminate, duplicate subscriptions: two attempts created at the same instant can still both be open).
  expireOpenSessions?(customerId: string): Promise<void>;
  createCheckoutSession(input: { customerId: string; userId: string; attemptId?: string }): Promise<{ url: string | null; sessionId?: string; expiresAt?: Date }>;
  // Optional durable one-active-checkout-per-agent reservation (migration 042). When present it is authoritative.
  reservation?: CheckoutReservation;
  log(message: string, detail?: unknown): void;
}

export interface ClaimResult {
  outcome: "claimed" | "existing_open" | "in_progress";
  attemptId?: string;
  sessionId?: string | null;
  url?: string | null;
}

export interface CheckoutReservation {
  claim(agentId: string, customerId: string, priceId: string): Promise<ClaimResult>; // atomic; may throw
  record(attemptId: string, sessionId: string, url: string | null, expiresAt: Date): Promise<boolean>; // false = the claim was swept
  fail(attemptId: string): Promise<void>; // release a claim whose session was never created
  expireSession(sessionId: string): Promise<void>; // expire a Stripe session this caller no longer owns
}

export interface CheckoutOutcome {
  status: number;
  body: { url?: string | null; error?: string };
}

// One retry covers a transient blip. A second failure stops the checkout.
export const PERSIST_ATTEMPTS = 2;

export const BILLING_UNAVAILABLE_MESSAGE = "Billing is temporarily unavailable. Please try again in a few minutes.";

async function persistCustomerId(deps: CheckoutDeps, userId: string, customerId: string): Promise<boolean> {
  for (let attempt = 1; attempt <= PERSIST_ATTEMPTS; attempt++) {
    let reason = "error";
    let code: string | undefined;
    try {
      const res = await deps.saveCustomerId(userId, customerId);
      if (res.error) {
        reason = "error";
        code = res.error.code;
      } else if (!res.rows || res.rows.length === 0) {
        reason = "no_row_matched";
      } else if (res.rows.length !== 1 || res.rows[0].id !== userId) {
        reason = "unexpected_rows";
      } else {
        return true;
      }
    } catch (err) {
      reason = "threw";
      code = (err as { code?: string } | null)?.code;
    }
    // Ids and a reason only: no email, no name, no error message text. The customer
    // id is included so an orphaned Stripe customer can be found and removed.
    deps.log("Could not save Stripe customer id", { userId, customerId, attempt, reason, ...(code ? { code } : {}) });
  }
  return false;
}

export async function processCheckoutRequest(deps: CheckoutDeps): Promise<CheckoutOutcome> {
  try {
    const user = await deps.getUser();
    if (!user) {
      return { status: 401, body: { error: "Unauthorized" } };
    }

    const profile = await deps.getProfile(user.id);
    if (!profile) {
      return { status: 404, body: { error: "Profile not found" } };
    }

    // A live subscription already exists: starting another checkout could bill the customer twice.
    // Existing subscribers (including an unpaid or payment-pending one) manage their plan in the billing portal. A canceled
    // subscription has its id cleared by the webhook, so resubscribing is allowed.
    if (profile.stripe_subscription_id) {
      return { status: 409, body: { error: "You already have a subscription. Manage it from the billing page." } };
    }

    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const customer = await deps.createCustomer({
        userId: user.id,
        email: profile.email || user.email || undefined,
        name: profile.name || undefined,
      });
      customerId = customer.id;

      if (!(await persistCustomerId(deps, user.id, customerId))) {
        return { status: 503, body: { error: BILLING_UNAVAILABLE_MESSAGE } };
      }
    }

    if (!deps.isPricingConfigured()) {
      return { status: 500, body: { error: "Stripe pricing not configured" } };
    }

    if (deps.reservation) return reservedCheckout(deps, user.id, customerId);

    if (deps.expireOpenSessions) {
      try { await deps.expireOpenSessions(customerId); } catch (err) {
        deps.log("Could not expire earlier open checkout sessions", { customerId, reason: err instanceof Error ? err.message : "unknown" });
      }
    }

    const session = await deps.createCheckoutSession({ customerId, userId: user.id });
    return { status: 200, body: { url: session.url } };
  } catch (err) {
    deps.log("Stripe checkout error:", err);
    return { status: 500, body: { error: "Failed to create checkout session" } };
  }
}

export const CHECKOUT_IN_PROGRESS_MESSAGE = "Your checkout is being prepared. Please wait a few seconds and try again.";

// The durable path. Order: claim (atomic, one active attempt per agent) -> expire any orphaned open Stripe sessions for the
// customer (crash recovery) -> create the session with the attempt id as the idempotency key -> record it.
async function reservedCheckout(deps: CheckoutDeps, userId: string, customerId: string): Promise<CheckoutOutcome> {
  const res = deps.reservation as CheckoutReservation;
  const priceId = "configured";
  let claim: ClaimResult;
  try {
    claim = await res.claim(userId, customerId, priceId);
  } catch (err) {
    deps.log("Could not claim a checkout attempt", { userId, reason: err instanceof Error ? err.message : "unknown" });
    return { status: 503, body: { error: BILLING_UNAVAILABLE_MESSAGE } };
  }
  if (claim.outcome === "existing_open") {
    // Double click, retry, lost response, or a session already paid whose webhook has not arrived: same session, no new one.
    return { status: 200, body: { url: claim.url ?? null } };
  }
  if (claim.outcome === "in_progress" || !claim.attemptId) {
    return { status: 409, body: { error: CHECKOUT_IN_PROGRESS_MESSAGE } };
  }
  const attemptId = claim.attemptId;

  if (deps.expireOpenSessions) {
    try { await deps.expireOpenSessions(customerId); } catch (err) {
      deps.log("Could not expire earlier open checkout sessions", { customerId, reason: err instanceof Error ? err.message : "unknown" });
    }
  }

  let session: { url: string | null; sessionId?: string; expiresAt?: Date };
  try {
    session = await deps.createCheckoutSession({ customerId, userId, attemptId });
  } catch (err) {
    try { await res.fail(attemptId); } catch { /* the lease lapses on its own */ }
    throw err;
  }
  if (!session.sessionId) {
    try { await res.fail(attemptId); } catch { /* the lease lapses on its own */ }
    return { status: 503, body: { error: BILLING_UNAVAILABLE_MESSAGE } };
  }
  let recorded = false;
  try {
    recorded = await res.record(attemptId, session.sessionId, session.url, session.expiresAt ?? new Date(Date.now() + 30 * 60_000));
  } catch (err) {
    deps.log("Could not record checkout session", { attemptId, sessionId: session.sessionId, reason: err instanceof Error ? err.message : "unknown" });
  }
  if (!recorded) {
    // Our claim was swept (slow request) or the write failed: this session is not owned, so it must not stay payable.
    try { await res.expireSession(session.sessionId); } catch (err) {
      deps.log("Could not expire an unowned checkout session", { sessionId: session.sessionId, reason: err instanceof Error ? err.message : "unknown" });
    }
    return { status: 409, body: { error: CHECKOUT_IN_PROGRESS_MESSAGE } };
  }
  return { status: 200, body: { url: session.url } };
}
