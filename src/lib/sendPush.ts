import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

let configured = false;

function configureWebPush(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@listingflare.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// Fire a push notification to every device an agent has subscribed.
// Silently no-ops if VAPID isn't configured - lets devs run without it set.
export async function sendPushToAgent(
  agentId: string,
  payload: PushPayload
): Promise<void> {
  if (!configureWebPush()) return;

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("agent_id", agentId);

  if (!subs || subs.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
        // Update last_used_at so we know this endpoint is still live
        await db
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", sub.id);
      } catch (err: unknown) {
        // Gone (410) or Not Found (404) means the subscription was revoked.
        // Delete it so we don't keep trying to send to dead endpoints.
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await db.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Push send error:", err);
        }
      }
    })
  );
}
