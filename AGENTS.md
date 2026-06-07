# AGENTS.md

## Project

`couple-cook-mini-app` is a Telegram Mini App MVP for couples. It helps to:

- store recipes,
- plan meals for the week,
- build a shared shopping list,
- add manual shopping items and mark items as bought.

The UI is a mobile-first Next.js app with three main tabs: recipes, week, and shopping. A compact family screen opens from the people icon in the top-right header.

## Stack

- Next.js App Router
- React 18
- TypeScript
- Tailwind CSS
- Prisma with PostgreSQL
- Vitest + Testing Library

## Code Quality & Development Best Practices

### 1. Next.js App Router & React 18 Architecture
- **Server Components by Default:** Keep components in the `app/` directory as Server Components (RSC) to minimize client-side JavaScript bundles. Use `'use client'` strictly at the leaf level for interactive UI elements.
- **Data Fetching:** Prefer server-side data fetching directly in Server Components or Server Actions. Minimize the use of client-side `useEffect` for initial data loading.
- **Safe Dynamic Imports:** Use `next/dynamic` for heavy client components or lazy loading sections of the app that are not needed during the first paint.

### 2. State Management & Data Consistency
- **URL as State:** For tab switching, filtering, or deep-linking inside the Mini App, prefer using Next.js URL Search Params (`useSearchParams`, `useRouter`) instead of global/local React state.
- **Optimistic UI Updates:** When updating the shopping list (marking items as bought) or updating meal plans, use React's `useOptimistic` hook or a lightweight client state management pattern to provide instant feedback before the DB confirms the mutation.
- **Form Handling:** Use native HTML forms with Next.js Server Actions and `useActionState` (or `useFormStatus`) for robust, type-safe validation and submittal.

### 3. Mobile-First UI & Tailwind Styling
- **True Mobile-First:** Write Tailwind classes assuming a mobile viewport first (e.g., `w-full text-base`). Use breakpoint prefixes (`sm:`, `md:`) only to scale up for desktop/browser preview mode.
- **Design Consistency:** Never use arbitrary Tailwind values (e.g., `text-[13px]`, `p-[11px]`) or hardcoded hex colors. Stick strictly to the standard Tailwind spacing scale and theme colors.
- **Safe Layouts:** Use viewport units carefully (`h-screen` can break on mobile browsers/Telegram webview). Prefer `h-[dynamic]` layouts or `svh` / `dvh` units for full-height views.
- **Semantic HTML:** Avoid generic `div` soup. Use `<main>`, `<section>`, `<nav>`, `<article>`, and correct button types (`type="button"` vs `type="submit"`) to ensure clean structure.

### 4. TypeScript & Prisma Safety
- **Strict Typing:** Avoid `any` or `unknown` type casting. Leverage automatic Prisma-generated types for database records.
- **Zod Validation:** Always validate incoming payloads in Next.js API Routes / Server Actions using `zod` schemas before touching Prisma models. Never trust data coming from the client side.

### 5. Engineering Principles
- **DRY:** Avoid duplicating business rules, validation schemas, data mapping, and UI behavior. Extract shared code only when duplication is real and the abstraction stays clear.
- **KISS:** Prefer the simplest implementation that satisfies the current requirement. Keep control flow, component props, and data transformations easy to read.
- **SOLID:** Keep modules and components focused on one responsibility, depend on stable interfaces where useful, and avoid changes that force unrelated code to change.
- **YAGNI:** Do not add speculative features, generic frameworks, premature abstractions, or unused extension points. Build what is required now and leave future work explicit.
- **Separation of Concerns:** Keep UI rendering, server actions, API route handling, validation, Prisma access, and business rules in clear, well-bounded layers.
- **Explicit Contracts:** Make data contracts visible through TypeScript types, Zod schemas, component props, return shapes, and documented assumptions between modules.
- **Testability:** Write business logic so it can be tested independently from React rendering, Next.js request objects, Telegram globals, and Prisma side effects.
- **Least Privilege:** Scope every API route, server action, and data query to the authenticated user and their household. Never trust client-provided ownership or household IDs.

---

## Main Files

- `src/app/mini-app.tsx` - primary client UI and state for the mini app
- `src/data/demo.ts` - demo recipes, week plan, and sample shopping data
- `src/lib/households.ts` - Telegram user bootstrap, household creation, invite creation, and invite acceptance logic
- `src/lib/shopping-list.ts` - shopping list aggregation and unit conversion logic
- `prisma/schema.prisma` - full database schema
- `prisma/migrations/` - Prisma migration history
- `src/app/api/auth/telegram/route.ts` - Telegram Mini App auth bootstrap route
- `src/app/api/invites/route.ts` - invite link creation route
- `src/app/api/*` - API route skeletons for recipes, meal plans, and shopping list

## Current Product State

- Telegram Mini App auth is wired through the UI:
  - the app loads Telegram `initData` from `window.Telegram.WebApp` and URL launch params,
  - the backend verifies `initData`,
  - authenticated users are upserted in PostgreSQL.
- Household flow is wired:
  - first authenticated user without an invite gets a new household named `Наша кухня` and owner role,
  - invited users without an existing household join the inviter's household as members,
  - users who already have a household do not join another household through an invite.
- The top-right people icon opens the family screen.
- The family screen shows household/demo status, role, invite action, last invite link, and a back button.
- Invite links are one-time use and expire after 7 days.
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
- Outside Telegram, demo data stays visible so the UI is usable in a browser.
- Inside Telegram after successful auth, recipes, weekly plan, manual items, and checked state start empty until full backend persistence is implemented.

## Architecture Notes

- The main UI state currently lives in `src/app/mini-app.tsx`.
- Demo data in `src/data/demo.ts` seeds non-Telegram/browser demo mode and keeps the UI usable without backend calls.
- Authenticated Telegram launches clear the demo seed state client-side.
- Shopping list generation is centralized in `src/lib/shopping-list.ts`; that file is the source of truth for unit conversion and item aggregation.
- Household and invite logic is centralized in `src/lib/households.ts`; that file owns user upsert, household bootstrap, invite URL generation, and invite acceptance rules.
- Prisma models exist for users, households, invites, recipes, meal plan items, shopping items, and check state.
- Migrations are now the preferred production path; `prisma migrate deploy` is the deployment target, not `db push`.
- `vercel-build` runs `prisma generate && prisma migrate deploy && next build`.
- Telegram Mini App support requires the official `https://telegram.org/js/telegram-web-app.js` script in `src/app/layout.tsx`.

## Current Limitations

- The recipe photo attachment in the UI is still client-side only; it previews the image but does not upload it to storage yet.
- Recipes, weekly planning, manual shopping items, and checked shopping state are still primarily client-state backed; the backend schema exists, but the app does not yet persist these user actions end-to-end.
- The family screen does not yet list household members because the API does not return a members list.
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

For Supabase on Vercel, prefer the IPv4-compatible session pooler connection string on port `5432`. Direct Supabase database hosts may fail from Vercel with `P1001` if IPv6-only access is involved.

To reset production app data without dropping tables or migrations, run this in Supabase SQL Editor:

```sql
TRUNCATE TABLE
  "ShoppingCheckState",
  "ShoppingManualItem",
  "MealPlanItem",
  "RecipeIngredient",
  "Recipe",
  "Product",
  "Invite",
  "HouseholdMember",
  "Household",
  "User"
RESTART IDENTITY CASCADE;
```

Do not drop `_prisma_migrations`.

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
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_APP_SHORT_NAME`

Optional future Supabase Storage variables, currently not used by the app:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_RECIPE_BUCKET`

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
- **Strict Compliance:** Always match generated code with the architecture guidelines and quality standards defined in the `Code Quality & Development Best Practices` section above.
