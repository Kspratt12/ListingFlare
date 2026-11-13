import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { processStripeEvent } from "@/lib/stripeWebhook";

// Use service role to bypass RLS in webhook handler
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const stripe = getStripe();

  const toView = (s: Stripe.Subscription) => ({
    id: s.id,
    status: s.status,
    customerId: typeof s.customer === "string" ? s.customer : s.customer?.id ?? null,
    priceIds: (s.items?.data ?? []).map((i) => i.price?.id).filter((x): x is string => !!x),
    userIdMeta: s.metadata?.supabase_user_id || null,
  });
  const toProfile = (r: { id: string; stripe_subscription_id: string | null; subscription_status: string | null } | null) =>
    r ? { id: r.id, stripeSubscriptionId: r.stripe_subscription_id, status: r.subscription_status } : null;

  try {
    const outcome = await processStripeEvent(
      { id: event.id, type: event.type, object: event.data.object as unknown as Record<string, unknown> },
      {
        configuredPriceId: process.env.STRIPE_MONTHLY_PRICE_ID || null,
        retrieveSubscription: async (id) => {
          try {
            return toView(await stripe.subscriptions.retrieve(id));
          } catch (err) {
            if ((err as { code?: string; statusCode?: number })?.code === "resource_missing" || (err as { statusCode?: number })?.statusCode === 404) return null;
            throw err;
          }
        },
        findProfileBySubscription: async (subId) => {
          const { data, error } = await supabase.from("agent_profiles").select("id, stripe_subscription_id, subscription_status").eq("stripe_subscription_id", subId).limit(1);
          return { profile: toProfile(data?.[0] ?? null), error: !!error };
        },
        findProfileById: async (userId) => {
          const { data, error } = await supabase.from("agent_profiles").select("id, stripe_subscription_id, subscription_status").eq("id", userId).limit(1);
          return { profile: toProfile(data?.[0] ?? null), error: !!error };
        },
        updateProfile: async (userId, fields, onlyIfSubscriptionId) => {
          let q = supabase.from("agent_profiles").update(fields).eq("id", userId);
          if (typeof onlyIfSubscriptionId === "string") q = q.eq("stripe_subscription_id", onlyIfSubscriptionId);
          else if (onlyIfSubscriptionId === null) q = q.is("stripe_subscription_id", null);
          const { data, error } = await q.select("id");
          return { error: !!error, rows: data?.length ?? 0 };
        },
        ...(process.env.CHECKOUT_RESERVATION === "on" ? {
          markCheckoutCompleted: async (sessionId: string, subscriptionId: string) => { await supabase.rpc("complete_checkout_session", { p_session: sessionId, p_subscription: subscriptionId }); },
          markCheckoutExpired: async (sessionId: string) => { await supabase.rpc("expire_checkout_session", { p_session: sessionId }); },
        } : {}),
        // Ids and reasons only: no emails, names or payloads.
        log: (level, message, detail) => (level === "error" ? console.error : level === "warn" ? console.warn : console.log)("Stripe webhook:", message, detail ?? {}),
      }
    );
    return NextResponse.json(outcome.body, { status: outcome.status });
  } catch (err) {
    console.error("Webhook handler error:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
