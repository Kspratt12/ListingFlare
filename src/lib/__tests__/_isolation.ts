// Imported (for its side effect) by the tests for the showing-booking, auth and
// automation-gate code. It makes sure those tests can never reach a real service:
//
//  - every variable that points at a provider, a database or a secret is removed
//    from this process's environment (nothing here reads .env.local; the runner
//    does not load it, and these tests would not need it)
//  - fetch is replaced with a function that throws, so any accidental network
//    call fails the test loudly instead of going out
//
// The code under test receives fakes through its dependency parameters.

const SCRUBBED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "RESEND_FROM_EMAIL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "VAPID_PRIVATE_KEY",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "CRON_SECRET",
  "NURTURE_SENDS_ENABLED",
  "DISABLE_TRIAL_LIFECYCLE",
  "NEXT_PUBLIC_APP_URL",
];

for (const key of SCRUBBED) delete process.env[key];

export const networkAttempts: string[] = [];

globalThis.fetch = (async (input: unknown) => {
  const target = typeof input === "string" ? input : String((input as { url?: string })?.url ?? input);
  networkAttempts.push(target);
  throw new Error(`Network call attempted during a test: ${target}`);
}) as typeof fetch;

export function assertNoNetworkAttempts(): void {
  if (networkAttempts.length > 0) {
    throw new Error(`Unexpected network calls: ${networkAttempts.join(", ")}`);
  }
}

export function setEnv(name: string, value: string | undefined): void {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[name];
  else env[name] = value;
}
