# ListingFlare

AI-powered single-property websites for listing agents. Each listing gets its own branded page with an AI assistant that answers buyer questions around the clock, captures leads, and books showings, so the agent owns the lead instead of a portal.

Live site: https://www.listingflare.com

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, Supabase (auth, database, storage), deployed on Vercel.

## Development

```bash
cp .env.example .env.local   # fill in Supabase and API keys
npm install
npm run dev                  # http://localhost:3000
```

Database schema and migrations are the `supabase-*.sql` files in the repo root; apply them in order in the Supabase SQL editor.
