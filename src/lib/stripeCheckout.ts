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
  createCheckoutSession(input: { customerId: string; userId: string }): Promise<{ url: string | null }>;
  log(message: string, detail?: unknown): void;
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

    const session = await deps.createCheckoutSession({ customerId, userId: user.id });
    return { status: 200, body: { url: session.url } };
  } catch (err) {
    deps.log("Stripe checkout error:", err);
    return { status: 500, body: { error: "Failed to create checkout session" } };
  }
}
