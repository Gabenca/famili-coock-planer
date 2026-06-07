# Backend Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist recipes, weekly meal planning, manual shopping items, and shopping checked state in PostgreSQL for authenticated Telegram households.

**Architecture:** Keep demo mode client-side for browser usage, but authenticated Telegram launches should load and mutate household data through protected API routes. Add focused server services under `src/lib/` so route handlers stay thin and Prisma access is testable. Keep shopping aggregation centralized in `src/lib/shopping-list.ts`; persist only source records and checked keys.

**Tech Stack:** Next.js App Router route handlers, React 18, TypeScript, Prisma PostgreSQL, Zod, Vitest, Testing Library.

---

## File Structure

- Create `src/lib/household-session.ts`: resolves authenticated Telegram user to their active household membership.
- Create `src/lib/recipes.ts`: Prisma-backed recipe list/create/delete service.
- Create `src/lib/recipes.test.ts`: service tests with a lightweight fake Prisma client.
- Modify `src/app/api/recipes/route.ts`: protected `GET` and `POST` for real household recipes.
- Create `src/app/api/recipes/[recipeId]/route.ts`: protected `DELETE`.
- Create `src/lib/meal-plans.ts`: Prisma-backed weekly meal plan list/create/update/delete service.
- Create `src/lib/meal-plans.test.ts`: service tests for household scoping and mutation behavior.
- Modify `src/app/api/meal-plans/route.ts`: protected `GET` and `POST`.
- Create `src/app/api/meal-plans/[itemId]/route.ts`: protected `PATCH` and `DELETE`.
- Create `src/lib/shopping-data.ts`: Prisma-backed manual item and checked-state persistence; calls `buildShoppingList`.
- Create `src/lib/shopping-data.test.ts`: service tests for generated list, manual items, and checked state.
- Modify `src/app/api/shopping-list/route.ts`: protected `GET`, `POST` manual item, and `PATCH` checked state.
- Modify `src/app/mini-app.tsx`: load remote data after Telegram auth and call APIs for mutations; keep demo mode unchanged.
- Modify `src/app/mini-app.test.tsx`: cover authenticated loading and at least one persisted mutation per major area.

---

## API Contracts

### `GET /api/recipes`

Returns authenticated household recipes.

```json
{
  "recipes": [
    {
      "id": "recipe-id",
      "title": "Сырники",
      "instructions": "Смешать и обжарить.",
      "servings": 2,
      "photoUrl": null,
      "ingredients": [
        {
          "productId": "product-id-or-null",
          "name": "Творог",
          "quantity": 400,
          "unit": "г"
        }
      ]
    }
  ]
}
```

### `POST /api/recipes`

Creates one recipe in the authenticated household.

```json
{
  "title": "Сырники",
  "instructions": "Смешать и обжарить.",
  "servings": 2,
  "ingredients": [
    { "name": "Творог", "quantity": 400, "unit": "г" }
  ]
}
```

### `DELETE /api/recipes/[recipeId]`

Deletes a recipe only if it belongs to the authenticated household.

### `GET /api/meal-plans?weekStart=2026-06-08`

Returns plan items for the week.

```json
{
  "plan": [
    {
      "id": "plan-item-id",
      "date": "2026-06-08",
      "slot": "breakfast",
      "recipeId": "recipe-id",
      "servingsMultiplier": 1
    }
  ]
}
```

### `POST /api/meal-plans`

```json
{
  "date": "2026-06-08",
  "slot": "breakfast",
  "recipeId": "recipe-id",
  "servingsMultiplier": 1
}
```

### `PATCH /api/meal-plans/[itemId]`

```json
{
  "servingsMultiplier": 1.5
}
```

### `DELETE /api/meal-plans/[itemId]`

Deletes one meal plan item in the authenticated household.

### `GET /api/shopping-list?weekStart=2026-06-08`

Returns generated and manual shopping items for the week.

### `POST /api/shopping-list`

Creates a manual shopping item.

```json
{
  "weekStart": "2026-06-08",
  "name": "Кофе",
  "quantity": 1,
  "unit": "шт"
}
```

### `PATCH /api/shopping-list`

Persists checked state for one shopping item key.

```json
{
  "weekStart": "2026-06-08",
  "itemKey": "generated:rice:г",
  "checked": true
}
```

---

## Task 1: Household Session Helper

**Files:**
- Create: `src/lib/household-session.ts`
- Test indirectly through route/service tests in later tasks.

- [ ] **Step 1: Create helper**

Add a helper that authenticates the request and returns user plus first household membership.

```ts
import { NextRequest } from "next/server";

import { getTelegramUserFromRequest } from "./api-auth";
import { prisma } from "./prisma";

export class HouseholdSessionError extends Error {
  constructor(message = "Household membership required") {
    super(message);
    this.name = "HouseholdSessionError";
  }
}

export async function getHouseholdSession(request: NextRequest) {
  const telegramUser = getTelegramUserFromRequest(request);
  const user = await prisma.user.findUnique({
    where: { telegramId: telegramUser.telegramId },
    select: { id: true, telegramId: true }
  });

  if (!user) {
    throw new HouseholdSessionError("User must bootstrap auth first");
  }

  const membership = await prisma.householdMember.findFirst({
    where: { userId: user.id },
    select: { householdId: true, role: true },
    orderBy: { createdAt: "asc" }
  });

  if (!membership) {
    throw new HouseholdSessionError();
  }

  return {
    user,
    householdId: membership.householdId,
    role: membership.role
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/household-session.ts
git commit -m "feat: add household session helper"
```

---

## Task 2: Recipe Service and API

**Files:**
- Create: `src/lib/recipes.ts`
- Create: `src/lib/recipes.test.ts`
- Modify: `src/app/api/recipes/route.ts`
- Create: `src/app/api/recipes/[recipeId]/route.ts`

- [ ] **Step 1: Write failing service tests**

Cover:

- lists only recipes for one household;
- creates recipe with ingredients;
- rejects empty title, empty instructions, or no valid ingredients;
- deletes only recipes in the current household.

Run:

```bash
npm test -- src/lib/recipes.test.ts
```

Expected: fails because `src/lib/recipes.ts` does not exist yet.

- [ ] **Step 2: Implement `src/lib/recipes.ts`**

Export these functions and types:

```ts
export type RecipeInput = {
  title: string;
  instructions: string;
  servings?: number;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
};

export async function listRecipes(householdId: string, client = prisma) {}
export async function createRecipe(householdId: string, input: RecipeInput, client = prisma) {}
export async function deleteRecipe(householdId: string, recipeId: string, client = prisma) {}
```

Implementation rules:

- trim title, instructions, ingredient name, and unit;
- `servings` defaults to `2`;
- filter invalid ingredients before insert;
- throw `RecipeValidationError` for invalid input;
- use nested Prisma create for ingredients;
- use `deleteMany({ where: { id: recipeId, householdId } })` to enforce household scoping.

- [ ] **Step 3: Run recipe service tests**

```bash
npm test -- src/lib/recipes.test.ts
```

Expected: recipe service tests pass.

- [ ] **Step 4: Wire `src/app/api/recipes/route.ts`**

Replace demo response with protected handlers:

- `GET`: `getHouseholdSession(request)` then `listRecipes(session.householdId)`;
- `POST`: parse JSON, call `createRecipe`;
- `401` for Telegram auth errors;
- `403` for missing household session;
- `400` for validation errors.

- [ ] **Step 5: Add `src/app/api/recipes/[recipeId]/route.ts`**

Implement protected `DELETE` with household scoping.

- [ ] **Step 6: Verify**

```bash
npm test
npm run build
```

Expected: all tests and production build pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/recipes.ts src/lib/recipes.test.ts src/app/api/recipes/route.ts src/app/api/recipes/[recipeId]/route.ts
git commit -m "feat: persist household recipes"
```

---

## Task 3: Meal Plan Service and API

**Files:**
- Create: `src/lib/meal-plans.ts`
- Create: `src/lib/meal-plans.test.ts`
- Modify: `src/app/api/meal-plans/route.ts`
- Create: `src/app/api/meal-plans/[itemId]/route.ts`

- [ ] **Step 1: Write failing service tests**

Cover:

- lists only plan items in `[weekStart, weekStart + 7 days)`;
- creates item only when recipe belongs to household;
- updates `servingsMultiplier`;
- deletes only item in household.

Run:

```bash
npm test -- src/lib/meal-plans.test.ts
```

Expected: fails because `src/lib/meal-plans.ts` does not exist yet.

- [ ] **Step 2: Implement `src/lib/meal-plans.ts`**

Export:

```ts
export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner";

export type MealPlanInput = {
  date: string;
  slot: MealSlot;
  recipeId: string;
  servingsMultiplier: number;
};

export async function listMealPlan(householdId: string, weekStart: string, client = prisma) {}
export async function createMealPlanItem(householdId: string, input: MealPlanInput, client = prisma) {}
export async function updateMealPlanItem(householdId: string, itemId: string, servingsMultiplier: number, client = prisma) {}
export async function deleteMealPlanItem(householdId: string, itemId: string, client = prisma) {}
```

Implementation rules:

- valid slots are `breakfast`, `lunch`, `snack`, `dinner`;
- `servingsMultiplier` must be finite and greater than `0`;
- store `date` as a UTC date from `yyyy-MM-dd`;
- verify recipe ownership before creating an item;
- return API-friendly dates as `yyyy-MM-dd`.

- [ ] **Step 3: Run meal plan service tests**

```bash
npm test -- src/lib/meal-plans.test.ts
```

Expected: meal plan service tests pass.

- [ ] **Step 4: Wire API routes**

`src/app/api/meal-plans/route.ts`:

- `GET`: read `weekStart` query param, session, return plan;
- `POST`: read JSON body, create plan item.

`src/app/api/meal-plans/[itemId]/route.ts`:

- `PATCH`: update multiplier;
- `DELETE`: delete item.

- [ ] **Step 5: Verify**

```bash
npm test
npm run build
```

Expected: all tests and production build pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/meal-plans.ts src/lib/meal-plans.test.ts src/app/api/meal-plans/route.ts src/app/api/meal-plans/[itemId]/route.ts
git commit -m "feat: persist weekly meal plan"
```

---

## Task 4: Shopping Persistence Service and API

**Files:**
- Create: `src/lib/shopping-data.ts`
- Create: `src/lib/shopping-data.test.ts`
- Modify: `src/app/api/shopping-list/route.ts`

- [ ] **Step 1: Write failing service tests**

Cover:

- builds generated shopping list from household recipes and plan items;
- includes manual items for the selected week;
- persists checked state by `weekStart + itemKey`;
- updates manual item quantity through service-level functions if needed by UI.

Run:

```bash
npm test -- src/lib/shopping-data.test.ts
```

Expected: fails because `src/lib/shopping-data.ts` does not exist yet.

- [ ] **Step 2: Implement `src/lib/shopping-data.ts`**

Export:

```ts
export type ManualShoppingInput = {
  weekStart: string;
  name: string;
  quantity: number;
  unit: string;
};

export type ShoppingCheckInput = {
  weekStart: string;
  itemKey: string;
  checked: boolean;
};

export async function getShoppingList(householdId: string, weekStart: string, client = prisma) {}
export async function createManualShoppingItem(householdId: string, input: ManualShoppingInput, client = prisma) {}
export async function updateShoppingCheckState(householdId: string, input: ShoppingCheckInput, client = prisma) {}
```

Implementation rules:

- fetch recipes with ingredients for the household;
- fetch meal plan items for the selected week;
- fetch manual items for the selected week;
- fetch checked states where `checked = true`;
- pass all of that to `buildShoppingList`;
- use Prisma `upsert` for `ShoppingCheckState`.

- [ ] **Step 3: Run shopping service tests**

```bash
npm test -- src/lib/shopping-data.test.ts
```

Expected: shopping persistence tests pass.

- [ ] **Step 4: Wire `src/app/api/shopping-list/route.ts`**

Implement:

- `GET`: protected list by `weekStart`;
- `POST`: protected create manual item;
- `PATCH`: protected checked-state update.

- [ ] **Step 5: Verify**

```bash
npm test
npm run build
```

Expected: all tests and production build pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/shopping-data.ts src/lib/shopping-data.test.ts src/app/api/shopping-list/route.ts
git commit -m "feat: persist shopping list state"
```

---

## Task 5: Client Data Loading and Mutations

**Files:**
- Modify: `src/app/mini-app.tsx`
- Modify: `src/app/mini-app.test.tsx`

- [ ] **Step 1: Add authenticated data loading test**

In `src/app/mini-app.test.tsx`, mock sequential fetch calls:

1. `POST /api/auth/telegram`;
2. `GET /api/recipes`;
3. `GET /api/meal-plans?weekStart=...`;
4. `GET /api/shopping-list?weekStart=...`.

Expected UI:

- renders remote recipe title;
- metrics reflect remote data;
- demo recipes are absent in authenticated mode.

- [ ] **Step 2: Add mutation tests**

Add tests for:

- creating a recipe calls `POST /api/recipes` and renders returned recipe;
- adding a meal calls `POST /api/meal-plans`;
- toggling a shopping item calls `PATCH /api/shopping-list`;
- adding manual item calls `POST /api/shopping-list`.

- [ ] **Step 3: Add client state flags**

In `MiniApp`, add:

```ts
const [dataLoading, setDataLoading] = useState(false);
const [dataError, setDataError] = useState("");
```

Keep demo mode unchanged. Only load remote data after `authState.status === "ready"`.

- [ ] **Step 4: Add API helpers inside `mini-app.tsx` or a small local module**

Use the current auth header pattern:

```ts
headers: {
  authorization: `tma ${authState.initData}`,
  "content-type": "application/json"
}
```

Do not send auth headers in demo mode.

- [ ] **Step 5: Replace authenticated local-only recipe creation**

If `authState.status === "ready"`:

- call `POST /api/recipes`;
- append the returned recipe;
- clear the form only after success.

If demo mode:

- keep current local behavior.

- [ ] **Step 6: Replace authenticated meal plan mutations**

For authenticated mode:

- `addMeal` calls `POST /api/meal-plans`;
- `updateMealServings` calls `PATCH /api/meal-plans/[itemId]`;
- `removeMeal` calls `DELETE /api/meal-plans/[itemId]`.

Use optimistic updates only after the first server-backed version works.

- [ ] **Step 7: Replace authenticated shopping mutations**

For authenticated mode:

- `addExtraItem` calls `POST /api/shopping-list`;
- `toggleItem` calls `PATCH /api/shopping-list`;
- after shopping mutations, either patch local state or reload `/api/shopping-list`.

Prefer reloading shopping list for the first implementation because generated items depend on plan and recipes.

- [ ] **Step 8: Verify**

```bash
npm test
npm run build
```

Expected: all tests and production build pass.

- [ ] **Step 9: Commit**

```bash
git add src/app/mini-app.tsx src/app/mini-app.test.tsx
git commit -m "feat: load and mutate household data"
```

---

## Task 6: Household Members Screen

**Files:**
- Create: `src/app/api/household/route.ts`
- Modify: `src/app/mini-app.tsx`
- Modify: `src/app/mini-app.test.tsx`

- [ ] **Step 1: Add API route**

Create protected `GET /api/household` returning:

```json
{
  "household": {
    "id": "household-id",
    "name": "Наша кухня",
    "role": "owner",
    "members": [
      {
        "id": "user-id",
        "firstName": "Max",
        "lastName": null,
        "username": "max",
        "role": "owner"
      }
    ]
  }
}
```

- [ ] **Step 2: Load members in family panel**

After auth is ready, fetch `/api/household` and show compact member rows in the family screen.

- [ ] **Step 3: Add UI test**

Mock household response and assert member name and role render in the family screen.

- [ ] **Step 4: Verify**

```bash
npm test
npm run build
```

Expected: all tests and production build pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/household/route.ts src/app/mini-app.tsx src/app/mini-app.test.tsx
git commit -m "feat: show household members"
```

---

## Task 7: Final Verification

**Files:**
- Existing project files only.

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected:

```text
Test Files  passed
Tests       passed
```

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: Next.js production build succeeds.

- [ ] **Step 3: Run Prisma migration deploy against local database**

```bash
npx prisma migrate deploy
```

Expected: migrations apply cleanly or report no pending migrations.

- [ ] **Step 4: Manual browser smoke test**

Run:

```bash
npm run dev
```

Open `http://localhost:3000` and verify:

- demo mode still shows demo recipes;
- recipe creation still works in browser demo mode;
- weekly plan still updates in browser demo mode;
- shopping manual item and checked state still work in browser demo mode.

- [ ] **Step 5: Manual Telegram smoke test**

With production env vars configured, verify in Telegram:

- first user opens app and gets empty real household data;
- user creates recipe;
- user adds recipe to the week;
- shopping list includes generated ingredients;
- manual shopping item appears;
- checked state survives reload;
- invite link lets second user join the same household;
- second user sees the first user's recipe, plan, and shopping list.

---

## Future Work Not In This Plan

- Recipe photo upload to Supabase Storage or Vercel Blob.
- Recipe editing.
- Week navigation beyond the current week.
- Product autocomplete from historical products.
- Offline-first optimistic sync.
- Rate limiting invite creation.
