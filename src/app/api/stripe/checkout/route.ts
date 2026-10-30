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
          .select("stripe_customer_id, email, name")
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

      createCheckoutSession: async ({ customerId, userId }) => {
        // Create checkout session with monthly subscription
        const priceId = process.env.STRIPE_MONTHLY_PRICE_ID as string;
        const session = await getStripe().checkout.sessions.create({
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
        });
        return { url: session.url };
      },

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
