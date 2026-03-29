## Atelier

Atelier is a Bulgarian-language marketplace prototype for matching clients with verified creative professionals. The product combines AI-assisted intake, offer comparison, project workspaces, and Stripe-backed payments on top of a Next.js application.

## Stack

- `Next.js 16` App Router
- `React 19`
- `Prisma` with PostgreSQL
- `Supabase` for auth and realtime
- `Stripe Checkout`
- `Tailwind CSS 4`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template and fill in the required values:

```bash
cp .env.example .env.local
```

3. Validate and generate Prisma artifacts:

```bash
npm run db:validate
npm run db:generate
```

4. Push the schema and optionally seed demo data:

```bash
npm run db:push
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

## Environment Variables

The required variables are documented in `.env.example`.

Core runtime values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`

Optional services:

- `REDIS_URL`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_AI_API_KEY`

## Payments

The checkout flow uses Stripe Checkout Sessions and persists payment state in Prisma.

- Create sessions with `POST /api/payments/create-session`
- Receive Stripe events at `POST /api/payments/webhook`
- Read payment state from `GET /api/payments/[id]`
- Download receipts from `GET /api/payments/[id]/receipt`

Local webhook forwarding:

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Copy the returned signing secret into `STRIPE_WEBHOOK_SECRET`.

## Database Notes

- Prisma schema: `prisma/schema.prisma`
- Seed data: `prisma/seed.ts`
- Supabase bootstrap SQL: `supabase/setup.sql`

The schema includes users, requests, offers, projects, milestones, messages, attachments, payments, and reviews.

## Deployment

Preview deployments are the safest default.

Before deploying to Vercel, add the production equivalents of the local environment variables:

- Supabase URL and keys
- Postgres connection strings
- Stripe secret, publishable, and webhook secrets
- `NEXT_PUBLIC_APP_URL` pointing to the deployed URL

Recommended pre-deploy checks:

```bash
npm run lint
npm run build
```

If the Prisma schema changes, apply the corresponding migration before or during release.

## Verification

Current local verification commands:

```bash
npm run lint
npm run build
```
