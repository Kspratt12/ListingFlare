# Scheduled seller reports

Agents can email their seller the activity report on a schedule. The report has the same metrics and
definitions as the printable report (`lib/sellerReport.ts`).

## What the agent controls (listing editor → Scheduled seller reports)

- **Recipient:** the listing's active seller portal (name + email). There is no free-text recipient.
  Revoking the portal stops the reports.
- **Cadence:** every week, every two weeks, or monthly (1st of the month).
- **Timing:** a weekday, an earliest send hour, and a time zone. The time zone defaults to the
  account's; Eastern time is used, and shown as such, when the account has none.
- **Portal link:** optional. When included, the email warns that the link is private.
- **Preview:** the exact email, in a sandboxed frame, before turning reports on.
- **Turn on / Pause**, plus the last five sends with their status.

Each report covers the 7, 14 or 30 days before its planned send time. It contains counts with
definitions, never buyer names, contact details or conversations.

## When nothing is sent

A report is skipped, recorded once, and the schedule moves on when any of these is true:
- the schedule is off;
- the listing is a draft or archived;
- the agent's trial ended without a subscription;
- there is no active seller portal, or its email is invalid.

## Delivery safety

- One send per (schedule, period), enforced by a unique constraint (migration 047). Duplicate or
  overlapping scheduler calls cannot double-send.
- A failed send is retried for the same period after one hour, up to 3 attempts. A send stuck in
  "sending" is retried after 15 minutes.
- Resend receives an `Idempotency-Key` per (schedule, period).
- Status `accepted` means the provider accepted the message. The UI says inbox delivery is not confirmed.
- Responses and logs contain counts and short codes only.

## Activation (each needs approval)

1. Apply migration 047 (after 017) to the production database.
2. Set `SELLER_REPORTS_ENABLED=1` (exactly). `RESEND_API_KEY` and `CRON_SECRET` already exist for other jobs.
3. Schedule `GET /api/cron/seller-reports` with `Authorization: Bearer <CRON_SECRET>`. It is **not** in
   `vercel.json` yet. To use Vercel Cron, add:
   `{ "path": "/api/cron/seller-reports", "schedule": "0 * * * *" }`
   Hourly crons need a paid Vercel plan; on Hobby, use a daily schedule (reports then go out once a
   day, on the first run after their planned time) or an external scheduler.
4. Check with one schedule for a test listing whose seller portal uses your own email address.

**Disable:** unset `SELLER_REPORTS_ENABLED`. Nothing is sent, and schedules and history are kept.

**Not verified:** a real Resend send, real inbox delivery, or a real scheduler invocation.
