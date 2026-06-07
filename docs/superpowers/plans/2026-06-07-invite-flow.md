# Invite Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real Telegram invite flow that creates households, creates invite links, and lets one invited user join an existing household.

**Architecture:** Add a focused server service in `src/lib/households.ts` for user, household, and invite mutations. API routes call this service after Telegram auth. The client keeps demo app behavior but authenticates on launch, passes invite tokens, and exposes a compact invite button in the header.

**Tech Stack:** Next.js App Router route handlers, React 18 client component, TypeScript, Prisma, Vitest.

---

## File Structure

- Create `src/lib/households.ts`: Prisma-backed service for auth bootstrap, invite creation, invite link construction, and invite acceptance.
- Create `src/lib/households.test.ts`: mocked Prisma unit tests for the household service.
- Modify `src/app/api/auth/telegram/route.ts`: replace demo household response with real bootstrap service.
- Create `src/app/api/invites/route.ts`: protected invite creation endpoint.
- Modify `src/app/mini-app.tsx`: read invite token, authenticate launch, show household status and invite action.
- Modify `src/app/mini-app.test.tsx`: cover invite UI status where practical.

### Task 1: Household Service

**Files:**
- Create: `src/lib/households.ts`
- Create: `src/lib/households.test.ts`

- [ ] **Step 1: Write service tests**

Create tests that mock Prisma and verify first-user household creation, invite creation, accepting active invite, rejecting users who already have a household, and expiring old invites.

- [ ] **Step 2: Implement service**

Implement:

- `bootstrapTelegramUser(user, inviteToken?)`
- `createHouseholdInvite(user)`
- `buildInviteUrl(token)`

Use Prisma transactions for invite acceptance.

- [ ] **Step 3: Run tests**

Run:

```bash
npm test -- src/lib/households.test.ts
```

Expected: service tests pass.

### Task 2: API Routes

**Files:**
- Modify: `src/app/api/auth/telegram/route.ts`
- Create: `src/app/api/invites/route.ts`

- [ ] **Step 1: Wire auth bootstrap**

Parse optional JSON body with `inviteToken`, authenticate Telegram init data, and return the service result.

- [ ] **Step 2: Add invite creation route**

Authenticate Telegram init data and call `createHouseholdInvite`.

- [ ] **Step 3: Run tests/build type check**

Run:

```bash
npm test
```

Expected: existing auth and shopping list tests still pass.

### Task 3: Client Invite UI

**Files:**
- Modify: `src/app/mini-app.tsx`
- Modify: `src/app/mini-app.test.tsx`

- [ ] **Step 1: Add client auth state**

On mount, read Telegram init data and invite token from Telegram `start_param` or `?invite=`.

- [ ] **Step 2: Add header invite controls**

Show household/demo status and invite button. On click, call `/api/invites`, copy the returned URL, and show success/error status.

- [ ] **Step 3: Add UI test**

Cover invite section rendering in demo mode or authenticated mock mode.

- [ ] **Step 4: Run tests**

Run:

```bash
npm test
```

Expected: all tests pass.

### Task 4: Production Verification

**Files:**
- Existing project files only.

- [ ] **Step 1: Build locally**

Run:

```bash
npm run build
```

Expected: Next.js production build succeeds.

- [ ] **Step 2: Deploy after user approval if needed**

Run:

```bash
npx vercel deploy --prod --yes
```

Expected: Vercel build succeeds and migrations remain up to date.
