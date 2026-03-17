"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface BillingInfo {
  subscription_status: string;
  trial_ends_at: string;
  setup_fee_paid: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export default function BillingContent() {
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const searchParams = useSearchParams();
  const supabase = createClient();

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    async function fetchBilling() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("agent_profiles")
        .select(
          "subscription_status, trial_ends_at, setup_fee_paid, stripe_customer_id, stripe_subscription_id"
        )
        .eq("id", user.id)
        .single();

      setBilling(data as BillingInfo);
      setLoading(false);
    }
    fetchBilling();
  }, [supabase]);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
    else setCheckoutLoading(false);
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
    else setPortalLoading(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const trialEnds = billing?.trial_ends_at
    ? new Date(billing.trial_ends_at)
    : null;
  const trialDaysLeft = trialEnds
    ? Math.max(
        0,
        Math.ceil((trialEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : 0;
  const isTrialing = billing?.subscription_status === "trialing";
  const isActive = billing?.subscription_status === "active";
  const isPastDue = billing?.subscription_status === "past_due";
  const isCanceled = billing?.subscription_status === "canceled";
  const needsSubscription = isTrialing || isCanceled;

  const statusConfig: Record<
    string,
    { label: string; color: string; icon: typeof CheckCircle }
  > = {
    active: {
      label: "Active",
      color: "bg-green-50 text-green-700 border-green-200",
      icon: CheckCircle,
    },
    trialing: {
      label: `Trial — ${trialDaysLeft} days left`,
      color: "bg-blue-50 text-blue-700 border-blue-200",
      icon: Clock,
    },
    past_due: {
      label: "Past Due",
      color: "bg-amber-50 text-amber-700 border-amber-200",
      icon: AlertTriangle,
    },
    canceled: {
      label: "Canceled",
      color: "bg-red-50 text-red-700 border-red-200",
      icon: XCircle,
    },
    unpaid: {
      label: "Unpaid",
      color: "bg-red-50 text-red-700 border-red-200",
      icon: XCircle,
    },
  };

  const status =
    statusConfig[billing?.subscription_status || "trialing"] ||
    statusConfig.trialing;
  const StatusIcon = status.icon;

  return (
    <div className="mx-auto max-w-2xl">
      <div>
        <h1 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">
          Billing
        </h1>
        <p className="mt-1 text-gray-500">
          Manage your subscription and payment details.
        </p>
      </div>

      {success && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-5 py-4 text-green-700">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Subscription activated!</p>
            <p className="mt-0.5 text-sm text-green-600">
              Your account is now fully active. Thank you for choosing
              ListingFlare.
            </p>
          </div>
        </div>
      )}
      {canceled && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-amber-700">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>Checkout was canceled. You can try again when you&apos;re ready.</p>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 md:p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-gray-400">
              Current Plan
            </p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-gray-900">
              ListingFlare Pro
            </h2>
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${status.color}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {status.label}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Monthly rate</p>
            <p className="mt-1 font-serif text-2xl font-bold text-gray-900">
              $150
              <span className="text-base font-normal text-gray-400">/mo</span>
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Setup fee</p>
            <p className="mt-1 font-serif text-2xl font-bold text-gray-900">
              {billing?.setup_fee_paid ? (
                <span className="flex items-center gap-2">
                  $500{" "}
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Paid
                  </span>
                </span>
              ) : (
                "$500"
              )}
            </p>
          </div>
        </div>

        {isTrialing && trialDaysLeft <= 3 && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Your trial expires{" "}
            {trialDaysLeft === 0
              ? "today"
              : `in ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"}`}
            . Subscribe now to keep your listings live.
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row">
          {needsSubscription && (
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="flex items-center justify-center gap-2 rounded-lg bg-gray-950 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {checkoutLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {isTrialing ? "Subscribe Now" : "Resubscribe"}
            </button>
          )}

          {(isActive || isPastDue) && billing?.stripe_customer_id && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Manage Subscription
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
