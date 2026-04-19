// One-time script to generate VAPID keys for web push notifications.
// Run: node scripts/generate-vapid.mjs
// Paste the output into your .env.local file.

import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("\nAdd these to .env.local AND your Vercel project environment variables:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:your-email@example.com`);
console.log("\nThe public key is safe to expose (it's in browser code).");
console.log("The private key MUST stay secret.\n");
