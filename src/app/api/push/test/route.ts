import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendPushToAgent, isPushConfigured } from "@/lib/sendPush";

export const dynamic = "force-dynamic";

// Fires a test notification to the authenticated agent so they can verify
// their phone is set up correctly.
export async function POST() {
  try {
    if (!isPushConfigured()) {
      return NextResponse.json(
        { error: "Push notifications not configured on this deployment" },
        { status: 503 }
      );
    }

    const authClient = createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await sendPushToAgent(user.id, {
      title: "It works.",
      body: "Your phone will buzz like this whenever a new lead or showing comes in.",
      url: "/dashboard",
      tag: "test",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Push test error:", err);
    return NextResponse.json({ error: "Failed to send test" }, { status: 500 });
  }
}
