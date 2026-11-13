import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { processCheckoutRequest, type CheckoutProfile } from "@/lib/stripeCheckout";

// Server-only admin client (bypasses row-level security). It is used for exactly one
// thing in this route: saving the Stripe customer id on the verified user's own
// profile row. Signed-in browsers cannot write billing columns on agent_profiles.
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST() {
  try {
    const supabase = createServerSupabaseClient();

    const outcome = await processCheckoutRequest({
      getUser: async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        return user ? { id: user.id, email: user.email } : null;
      },

      getProfile: async (userId) => {
        const { data } = await supabase
          .from("agent_profiles")
          .select("stripe_customer_id, email, name, stripe_subscription_id, subscription_status")
          .eq("id", userId)
          .single();
        return (data as CheckoutProfile | null) ?? null;
      },

      createCustomer: async ({ userId, email, name }) => {
        const customer = await getStripe().customers.create({
          email,
          name,
          metadata: { supabase_user_id: userId },
        });
        return { id: customer.id };
      },

      // userId is the id of the verified session user, never a value from the request.
      // .select("id") makes the database report which rows changed, so the caller can
      // tell "saved on this profile" from "no error but nothing matched".
      saveCustomerId: async (userId, customerId) => {
        const { data, error } = await getAdminClient()
          .from("agent_profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", userId)
          .select("id");
        return {
          rows: (data as Array<{ id: string }> | null) ?? null,
          error: error ? { code: error.code } : null,
        };
      },

      isPricingConfigured: () => Boolean(process.env.STRIPE_MONTHLY_PRICE_ID),

      paused: () => process.env.CHECKOUT_PAUSED === "on",

      reconcileSubscription: async (subscriptionId) => {
        try {
          const s = await getStripe().subscriptions.retrieve(subscriptionId);
          return s.status === "canceled" || s.status === "incomplete_expired" ? "ended" : "live";
        } catch (err) {
          const e = err as { code?: string; statusCode?: number };
          if (e?.code === "resource_missing" || e?.statusCode === 404) return "missing"; // definitive answer
          throw err; // network, rate limit, 5xx, auth: never treated as "missing"
        }
      },
      clearSubscription: async (userId, subscriptionId) => {
        const { data, error } = await getAdminClient()
          .from("agent_profiles")
          .update({ subscription_status: "canceled", stripe_subscription_id: null })
          .eq("id", userId)
          .eq("stripe_subscription_id", subscriptionId)
          .select("id");
        return !error && !!data && data.length > 0;
      },

      sweepOpenSessions: async (customerId, exceptSessionId) => {
        const stripe = getStripe();
        const open = await stripe.checkout.sessions.list({ customer: customerId, status: "open", limit: 100 });
        let completedRecently = 0;
        for (const s of open.data) {
          if (s.id === exceptSessionId) continue;
          try {
            await stripe.checkout.sessions.expire(s.id);
          } catch {
            const cur = await stripe.checkout.sessions.retrieve(s.id);
            if (cur.status === "complete") completedRecently++;
          }
        }
        // Verify: nothing else is still open, and nothing completed in the last 35 minutes (its webhook may not have run).
        const again = await stripe.checkout.sessions.list({ customer: customerId, status: "open", limit: 100 });
        const stillOpen = again.data.filter((s) => s.id !== exceptSessionId).length;
        const since = Math.floor(Date.now() / 1000) - 35 * 60;
        const done = await stripe.checkout.sessions.list({ customer: customerId, status: "complete", limit: 10, created: { gte: since } });
        completedRecently += done.data.filter((s) => s.id !== exceptSessionId).length;
        return { stillOpen, completedRecently };
      },

      expireOpenSessions: async (customerId) => {
        const open = await getStripe().checkout.sessions.list({ customer: customerId, status: "open", limit: 10 });
        for (const s of open.data) await getStripe().checkout.sessions.expire(s.id);
      },

      createCheckoutSession: async ({ customerId, userId, attemptId }) => {
        // Create checkout session with monthly subscription
        const priceId = process.env.STRIPE_MONTHLY_PRICE_ID as string;
        const expiresAt = Math.floor(Date.now() / 1000) + 31 * 60; // Stripe minimum is 30 minutes
        const session = await getStripe().checkout.sessions.create({
          expires_at: expiresAt,
          client_reference_id: attemptId, // ties a paid session to its reservation row
          customer: customerId,
          mode: "subscription",
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
          subscription_data: {
            metadata: { supabase_user_id: userId },
          },
        }, attemptId ? { idempotencyKey: "checkout-" + attemptId } : undefined);
        return { url: session.url, sessionId: session.id, expiresAt: new Date(expiresAt * 1000) };
      },

      reservation: process.env.CHECKOUT_RESERVATION === "on" ? {
        // Requires migration 042. Off by default so the code can ship before the migration is applied.
        claim: async (agentId, customerId, priceId) => {
          const { data, error } = await getAdminClient().rpc("claim_checkout_attempt", { p_agent: agentId, p_customer: customerId, p_price: priceId });
          if (error || !data || !data[0]) throw new Error(error?.code || "claim_failed");
          const r = data[0] as { outcome: "claimed" | "existing_open" | "in_progress"; attempt_id?: string; session_id?: string | null; checkout_url?: string | null };
          return { outcome: r.outcome, attemptId: r.attempt_id, sessionId: r.session_id, url: r.checkout_url };
        },
        record: async (attemptId, sessionId, url, expiresAt) => {
          const { data, error } = await getAdminClient().rpc("record_checkout_session", { p_attempt: attemptId, p_session: sessionId, p_url: url, p_session_expires_at: expiresAt.toISOString() });
          if (error) throw new Error(error.code || "record_failed");
          return data === true;
        },
        fail: async (attemptId) => { await getAdminClient().rpc("fail_checkout_attempt", { p_attempt: attemptId }); },
        expireSession: async (sessionId) => { await getStripe().checkout.sessions.expire(sessionId); },
      } : undefined,

      log: (message, detail) => console.error(message, detail),
    });

    return NextResponse.json(outcome.body, { status: outcome.status });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
