# FSD Frontend Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the Mini App frontend into Feature-Sliced Design layers without changing product behavior.

**Architecture:** Keep Next.js routing, Server Actions, API routes, and backend services in `src/app` and `src/lib`. Move frontend UI and pure frontend helpers from `src/app/mini-app-client.tsx` into `pages`, `widgets`, `features`, `entities`, and `shared` public APIs. Preserve FSD import direction: app -> pages -> widgets -> features -> entities -> shared.

**Tech Stack:** Next.js App Router, React 18, TypeScript, Tailwind CSS, Vitest + Testing Library.

---

## Execution Status

Completed in isolated worktree `/tmp/codex-test-app-agents-compliance` on branch `agents-strict-compliance`.

- FSD page layer uses `src/frontend/pages` instead of `src/pages` to avoid Next.js Pages Router conflicts.
- Widgets, features, entities, and shared frontend helpers were extracted through public APIs.
- The old `src/app/mini-app-client.tsx` file was removed.
- Verification passed: `npm test` and `npm run build`.

## File Structure

- Modify: `src/app/mini-app.tsx` to import `MiniAppPage` from `@/frontend/pages/mini-app`.
- Modify: `src/app/mini-app.test.tsx` to import client page from `@/frontend/pages/mini-app`.
- Create: `src/frontend/pages/mini-app/index.ts`.
- Create: `src/frontend/pages/mini-app/ui/mini-app-page.tsx`.
- Create: `src/frontend/pages/mini-app/model/types.ts`.
- Create: `src/widgets/app-header/index.ts`.
- Create: `src/widgets/app-header/ui/app-header.tsx`.
- Create: `src/widgets/section-tabs/index.ts`.
- Create: `src/widgets/section-tabs/ui/section-tabs.tsx`.
- Create: `src/widgets/family-panel/index.ts`.
- Create: `src/widgets/family-panel/ui/family-panel.tsx`.
- Create: `src/widgets/recipes-panel/index.ts`.
- Create: `src/widgets/recipes-panel/ui/recipes-panel.tsx`.
- Create: `src/widgets/week-panel/index.ts`.
- Create: `src/widgets/week-panel/ui/week-panel.tsx`.
- Create: `src/widgets/shop-panel/index.ts`.
- Create: `src/widgets/shop-panel/ui/shop-panel.tsx`.
- Create: `src/features/create-recipe/index.ts`.
- Create: `src/features/create-recipe/ui/create-recipe-form.tsx`.
- Create: `src/features/manage-meal-plan/index.ts`.
- Create: `src/features/manage-meal-plan/ui/meal-slot-section.tsx`.
- Create: `src/features/manage-shopping-list/index.ts`.
- Create: `src/features/manage-shopping-list/ui/manual-shopping-form.tsx`.
- Create: `src/features/toggle-shopping-item/index.ts`.
- Create: `src/features/toggle-shopping-item/ui/shopping-list-row.tsx`.
- Create: `src/entities/recipe/index.ts`.
- Create: `src/entities/recipe/model/types.ts`.
- Create: `src/entities/recipe/ui/recipe-card.tsx`.
- Create: `src/entities/meal-plan/index.ts`.
- Create: `src/entities/meal-plan/model/types.ts`.
- Create: `src/entities/shopping-list/index.ts`.
- Create: `src/entities/shopping-list/model/types.ts`.
- Create: `src/entities/household/index.ts`.
- Create: `src/entities/household/model/types.ts`.
- Create: `src/shared/ui/metric/index.ts`.
- Create: `src/shared/ui/metric/metric.tsx`.
- Create: `src/shared/lib/mini-app-url/index.ts`.
- Create: `src/shared/lib/mini-app-url/mini-app-url.ts`.
- Create: `src/shared/lib/telegram-launch/index.ts`.
- Create: `src/shared/lib/telegram-launch/telegram-launch.ts`.
- Create: `src/shared/lib/product-key/index.ts`.
- Create: `src/shared/lib/product-key/product-key.ts`.
- Add/modify: `src/app/fsd-boundary.test.ts`.
- Remove: `src/app/mini-app-client.tsx` after migration.

## Task 1: Architecture Boundary Tests

- [ ] **Step 1: Write failing FSD boundary tests**

Create `src/app/fsd-boundary.test.ts` with tests that assert:

```ts
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const srcDir = join(process.cwd(), "src");

describe("FSD frontend structure", () => {
  it("exposes public APIs for the Mini App page and frontend slices", () => {
    const publicApis = [
      "frontend/pages/mini-app/index.ts",
      "widgets/app-header/index.ts",
      "widgets/section-tabs/index.ts",
      "widgets/family-panel/index.ts",
      "widgets/recipes-panel/index.ts",
      "widgets/week-panel/index.ts",
      "widgets/shop-panel/index.ts",
      "features/create-recipe/index.ts",
      "features/manage-meal-plan/index.ts",
      "features/manage-shopping-list/index.ts",
      "features/toggle-shopping-item/index.ts",
      "entities/recipe/index.ts",
      "entities/meal-plan/index.ts",
      "entities/shopping-list/index.ts",
      "entities/household/index.ts"
    ];

    for (const publicApi of publicApis) {
      expect(existsSync(join(srcDir, publicApi)), publicApi).toBe(true);
    }
  });

  it("keeps the Next app entry as a server wrapper over the FSD page", () => {
    const miniAppEntry = readFileSync(join(srcDir, "app/mini-app.tsx"), "utf8");

    expect(miniAppEntry.startsWith('"use client";')).toBe(false);
    expect(miniAppEntry).toContain('from "@/frontend/pages/mini-app"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/fsd-boundary.test.ts`

Expected: FAIL because FSD public API files do not exist yet and `src/app/mini-app.tsx` still imports `./mini-app-client`.

## Task 2: Create Entities and Shared Helpers

- [ ] **Step 1: Create frontend entity model/public API files**

Create entity public APIs for recipe, meal plan, shopping list, and household. Move type aliases from `mini-app-client.tsx` into these files.

- [ ] **Step 2: Create shared helper public APIs**

Move pure helpers `createProductKey`, URL state helpers, and Telegram launch param helpers into `src/shared/lib/*`.

- [ ] **Step 3: Run boundary test**

Run: `npm test -- src/app/fsd-boundary.test.ts`

Expected: still FAIL until widgets/features/pages are created.

## Task 3: Extract Features and Widgets

- [ ] **Step 1: Move recipe form to feature and recipe cards to entity**

Create `features/create-recipe` and `entities/recipe` UI files. Keep props explicit and behavior identical.

- [ ] **Step 2: Move meal slot controls to feature and week panel to widget**

Create `features/manage-meal-plan` and `widgets/week-panel`.

- [ ] **Step 3: Move manual shopping form, shopping row, and shop panel**

Create `features/manage-shopping-list`, `features/toggle-shopping-item`, and `widgets/shop-panel`.

- [ ] **Step 4: Move header, tabs, family panel, and recipes panel widgets**

Create `widgets/app-header`, `widgets/section-tabs`, `widgets/family-panel`, and `widgets/recipes-panel`.

## Task 4: Create FSD Page Composition

- [ ] **Step 1: Move `MiniApp` client orchestration to page layer**

Create `src/frontend/pages/mini-app/ui/mini-app-page.tsx` with `"use client"` and the state/orchestration code from `src/app/mini-app-client.tsx`.

- [ ] **Step 2: Update imports**

Update:

```ts
// src/frontend/pages/mini-app/index.ts
export { MiniAppPage as MiniApp } from "./ui/mini-app-page";
export type { MiniAppInitialData } from "./model/types";
```

Update `src/app/mini-app.tsx` to import from `@/frontend/pages/mini-app`.

Update `src/app/mini-app.test.tsx` to import from `@/frontend/pages/mini-app`.

- [ ] **Step 3: Remove old client file**

Delete `src/app/mini-app-client.tsx`.

## Task 5: Verify Behavior and Build

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- src/app/fsd-boundary.test.ts src/app/component-boundary.test.ts src/app/mini-app-server.test.tsx src/app/mini-app.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run all tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: PASS.

## Self-Review

- Spec coverage: covers frontend-only FSD, public APIs, import direction, and behavior preservation.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: public exports use `MiniApp` alias to preserve existing imports where useful, and model types are shared through entity/page APIs.
