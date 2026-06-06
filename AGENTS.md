# AGENTS.md

## Project

`couple-cook-mini-app` is a Telegram Mini App MVP for couples. It helps to:

- store recipes,
- plan meals for the week,
- build a shared shopping list,
- add manual shopping items and mark items as bought.

The UI is a mobile-first Next.js app with three main tabs: recipes, week, and shopping.

## Stack

- Next.js App Router
- React 18
- TypeScript
- Tailwind CSS
- Prisma with PostgreSQL
- Vitest + Testing Library

## Main Files

- `src/app/mini-app.tsx` - primary client UI and state for the mini app
- `src/data/demo.ts` - demo recipes, week plan, and sample shopping data
- `src/lib/shopping-list.ts` - shopping list aggregation and unit conversion logic
- `prisma/schema.prisma` - full database schema
- `prisma/migrations/` - Prisma migration history
- `src/app/api/*` - API route skeletons for recipes, meal plans, shopping list, and Telegram auth

## Current Product State

- Recipes can be created in the UI with:
  - title,
  - photo attachment,
  - ingredients,
  - cooking instructions.
- Weekly planning supports multiple recipes per day and meal slots:
  - breakfast,
  - lunch,
  - snack,
  - dinner.
- Shopping list supports:
  - generated items from the meal plan,
  - manual items,
  - item quantities and units,
  - checked state.

## Architecture Notes

- The main UI state currently lives in `src/app/mini-app.tsx`.
- Demo data in `src/data/demo.ts` seeds the first render and keeps the UI usable without backend calls.
- Shopping list generation is centralized in `src/lib/shopping-list.ts`; that file is the source of truth for unit conversion and item aggregation.
- Prisma models already exist for households, recipes, meal plan items, shopping items, and check state.
- Migrations are now the preferred production path; `prisma migrate deploy` is the deployment target, not `db push`.

## Current Limitations

- The recipe photo attachment in the UI is still client-side only; it previews the image but does not upload it to storage yet.
- The recipe planner and shopping checklist are still primarily client-state backed in the demo UI; the backend schema exists, but the app does not yet persist user actions end-to-end.
- The Telegram integration is scaffolded, but the full authenticated household flow is not wired through the UI yet.
- For local development, the project expects the Docker PostgreSQL container `Shiba-db` on `localhost:5432` with database `couple_cook`.

## Local Development

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

App runs on `http://localhost:3000`.

## Database

- Prisma reads `DATABASE_URL` from `.env`.
- Local development uses a Docker PostgreSQL container named `Shiba-db`.
- Current local database:
  - host: `localhost:5432`
  - database: `couple_cook`
  - user: `postgres`
  - password: `password`

For production, use an external PostgreSQL provider and point `DATABASE_URL` there.

## Deployment

The repo is set up for Vercel-style deployment:

```bash
npm run vercel-build
```

This runs:

1. `prisma generate`
2. `prisma migrate deploy`
3. `next build`

Set these environment variables in production:

- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `NEXT_PUBLIC_APP_URL`

## Tests

```bash
npm test
npm run build
```

## Working Rules

- Prefer editing existing project patterns rather than introducing new abstractions.
- Use `apply_patch` for file edits.
- Do not overwrite unrelated user changes.
- Keep the UI mobile-first and compact; this is a mini app, not a marketing site.
