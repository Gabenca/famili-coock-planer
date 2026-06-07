# Zustand Mini App Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Mini App client state into a page-level Zustand model while preserving the existing UX, server actions, URL state, and backend contracts.

**Architecture:** Add a focused model layer under `src/frontend/pages/mini-app/model`. The Zustand store owns sync state and reducers, selectors derive display values, workflows own async orchestration, and `MiniAppPage` becomes a wiring component that keeps URL params as route state.

**Tech Stack:** Next.js App Router, React 18, TypeScript, Zustand 5, Vitest, Testing Library.

---

## File Structure

- Create `src/frontend/pages/mini-app/model/types.ts`
  - Page-level auth, initial data, state, and workflow dependency contracts.
- Create `src/frontend/pages/mini-app/model/store.ts`
  - Zustand store, initial state factory, sync reducers, and test reset helper.
- Create `src/frontend/pages/mini-app/model/selectors.ts`
  - Pure selectors for resolved shopping items, counts, and demo state.
- Create `src/frontend/pages/mini-app/model/workflows.ts`
  - Async workflows for Telegram bootstrap, data loading, invite creation, recipes, meal plans, shopping list mutations.
- Create `src/frontend/pages/mini-app/model/index.ts`
  - Public model exports for the page slice.
- Create `src/frontend/pages/mini-app/model/store.test.ts`
  - Unit tests for initial state and selectors.
- Create `src/frontend/pages/mini-app/model/workflows.test.ts`
  - Unit tests for authenticated data mapping and optimistic rollbacks.
- Modify `src/frontend/pages/mini-app/ui/mini-app-page.tsx`
  - Replace local state and inline async logic with store selectors and workflow calls.
- Modify `src/frontend/pages/mini-app/index.ts`
  - Export `MiniAppInitialData` from the model layer instead of the UI file.
- Modify `src/app/fsd-boundary.test.ts`
  - Assert the Mini App model public API exists.
- Modify `src/app/mini-app.test.tsx`
  - Add store reset in `afterEach` if model state persists across tests.

---

### Task 1: Add Model Contracts

**Files:**
- Create: `src/frontend/pages/mini-app/model/types.ts`
- Create: `src/frontend/pages/mini-app/model/index.ts`
- Modify: `src/frontend/pages/mini-app/index.ts`

- [ ] **Step 1: Create model types**

Create `src/frontend/pages/mini-app/model/types.ts` with these contracts:

```ts
import type {
  createInviteAction,
  createManualShoppingItemAction,
  createMealPlanItemAction,
  createRecipeAction,
  deleteMealPlanItemAction,
  updateMealPlanItemAction,
  updateShoppingCheckStateAction
} from "@/app/actions";
import type { MealSlot, PlannedMeal } from "@/data/demo";
import type { HouseholdMemberView } from "@/entities/household";
import type { AppRecipe } from "@/entities/recipe";
import type { ManualShoppingItem, RecipeIngredient, ShoppingListItem } from "@/lib/shopping-list";

export type InviteStatus = "accepted" | "ignored_existing_household" | "invalid" | "expired" | "none";

export type ReadyAuthState = {
  status: "ready";
  initData: string;
  household: {
    id: string;
    name: string;
    role: "owner" | "member";
  };
  inviteStatus: InviteStatus;
};

export type AuthState =
  | { status: "checking" }
  | { status: "demo"; message: string }
  | ReadyAuthState
  | { status: "error"; message: string };

export type MiniAppInitialData = {
  household: {
    id: string;
    name: string;
    role: "owner" | "member";
    members: HouseholdMemberView[];
  };
  recipes: AppRecipe[];
  planItems: PlannedMeal[];
  shoppingItems: ShoppingListItem[];
};

export type MiniAppState = {
  authState: AuthState;
  dataLoading: boolean;
  dataError: string;
  inviteMessage: string;
  inviteUrl: string;
  inviteLoading: boolean;
  householdMembers: HouseholdMemberView[];
  recipes: AppRecipe[];
  planItems: PlannedMeal[];
  checkedKeys: Set<string>;
  extraItems: ManualShoppingItem[];
  extraName: string;
  extraQuantity: string;
  extraUnit: string;
  remoteShoppingItems: ShoppingListItem[] | null;
};

export type MiniAppStore = MiniAppState & {
  initialize: (initialData?: MiniAppInitialData) => void;
  setAuthState: (authState: AuthState) => void;
  setDemoAuth: () => void;
  setDataLoading: (dataLoading: boolean) => void;
  setDataError: (dataError: string) => void;
  setInviteMessage: (inviteMessage: string) => void;
  setInviteUrl: (inviteUrl: string) => void;
  setInviteLoading: (inviteLoading: boolean) => void;
  setHouseholdMembers: (members: HouseholdMemberView[]) => void;
  setRecipes: (recipes: AppRecipe[]) => void;
  addRecipe: (recipe: AppRecipe) => void;
  setPlanItems: (planItems: PlannedMeal[]) => void;
  addPlanItem: (item: PlannedMeal) => void;
  replacePlanItem: (id: string, item: PlannedMeal) => void;
  updatePlanItemServings: (id: string, servingsMultiplier: number) => PlannedMeal | undefined;
  removePlanItem: (id: string) => PlannedMeal | undefined;
  restorePlanItem: (item: PlannedMeal) => void;
  setCheckedKeys: (checkedKeys: Set<string>) => void;
  toggleLocalCheckedKey: (key: string) => void;
  setExtraItems: (extraItems: ManualShoppingItem[]) => void;
  addExtraItem: (item: ManualShoppingItem) => void;
  updateExtraItemQuantity: (id: string, quantity: number) => void;
  setExtraName: (extraName: string) => void;
  setExtraQuantity: (extraQuantity: string) => void;
  setExtraUnit: (extraUnit: string) => void;
  resetExtraForm: () => void;
  setRemoteShoppingItems: (items: ShoppingListItem[] | null) => void;
  updateRemoteShoppingItemChecked: (key: string, checked: boolean) => void;
  updateRemoteManualQuantity: (id: string, quantity: number) => void;
  clearAuthenticatedClientData: (authState: ReadyAuthState) => void;
};

export type WorkflowActions = {
  createInviteAction: typeof createInviteAction;
  createManualShoppingItemAction: typeof createManualShoppingItemAction;
  createMealPlanItemAction: typeof createMealPlanItemAction;
  createRecipeAction: typeof createRecipeAction;
  deleteMealPlanItemAction: typeof deleteMealPlanItemAction;
  updateMealPlanItemAction: typeof updateMealPlanItemAction;
  updateShoppingCheckStateAction: typeof updateShoppingCheckStateAction;
};

export type WorkflowDependencies = WorkflowActions & {
  fetch: typeof fetch;
  getTelegramLaunchParams: () => {
    initData?: string;
    inviteToken?: string;
  };
  clipboard?: Pick<Clipboard, "writeText">;
  now: () => number;
};

export type AddRecipeInput = {
  title: string;
  ingredients: RecipeIngredient[];
  instructions: string;
  photoUrl?: string;
};

export type AddMealInput = {
  date: string;
  slot: MealSlot;
  recipeId: string;
};
```

- [ ] **Step 2: Create model public API**

Create `src/frontend/pages/mini-app/model/index.ts`:

```ts
export * from "./selectors";
export * from "./store";
export * from "./types";
export * from "./workflows";
```

- [ ] **Step 3: Update page public API type export**

Change `src/frontend/pages/mini-app/index.ts` from:

```ts
export { MiniAppPage as MiniApp } from "./ui/mini-app-page";
export type { MiniAppInitialData } from "./ui/mini-app-page";
```

to:

```ts
export { MiniAppPage as MiniApp } from "./ui/mini-app-page";
export type { MiniAppInitialData } from "./model";
```

- [ ] **Step 4: Run type check for model contracts**

Run:

```bash
npx tsc --noEmit
```

Expected: FAIL until later tasks create `selectors`, `store`, and `workflows`. The failure should be missing module errors for those files, not TypeScript syntax errors in `types.ts`.

---

### Task 2: Add Store and Selector Tests First

**Files:**
- Create: `src/frontend/pages/mini-app/model/store.test.ts`
- Create: `src/frontend/pages/mini-app/model/selectors.ts`
- Create: `src/frontend/pages/mini-app/model/store.ts`

- [ ] **Step 1: Write failing tests for initial state and selectors**

Create `src/frontend/pages/mini-app/model/store.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { demoPlan, demoRecipes, demoShoppingList } from "@/data/demo";
import { selectIsDemoMode, selectShoppingItems, selectSummaryCounts } from "./selectors";
import { createInitialMiniAppState } from "./store";
import type { MiniAppInitialData } from "./types";

describe("Mini App Zustand model", () => {
  it("creates demo state when no server data is provided", () => {
    const state = createInitialMiniAppState();

    expect(state.authState).toEqual({ status: "checking" });
    expect(state.recipes).toHaveLength(demoRecipes.length);
    expect(state.planItems).toHaveLength(demoPlan.length);
    expect(Array.from(state.checkedKeys)).toEqual(demoShoppingList.filter((item) => item.checked).map((item) => item.key));
    expect(selectIsDemoMode(state)).toBe(true);
  });

  it("creates ready state from server initial data", () => {
    const initialData: MiniAppInitialData = {
      household: {
        id: "household-1",
        name: "Наша кухня",
        role: "owner",
        members: [
          {
            id: "user-1",
            firstName: "Максим",
            lastName: null,
            username: "max",
            role: "owner"
          }
        ]
      },
      recipes: [
        {
          id: "recipe-1",
          title: "Омлет",
          instructions: "Взбить яйца.",
          servings: 2,
          ingredients: [{ productId: "egg", name: "Яйца", quantity: 4, unit: "шт" }]
        }
      ],
      planItems: [],
      shoppingItems: [
        {
          key: "manual:coffee",
          name: "Кофе",
          quantity: 1,
          unit: "шт",
          source: "manual",
          checked: true
        }
      ]
    };

    const state = createInitialMiniAppState(initialData);

    expect(state.authState).toEqual({
      status: "ready",
      initData: "",
      household: {
        id: "household-1",
        name: "Наша кухня",
        role: "owner"
      },
      inviteStatus: "none"
    });
    expect(state.householdMembers).toHaveLength(1);
    expect(state.recipes).toHaveLength(1);
    expect(state.remoteShoppingItems).toEqual(initialData.shoppingItems);
    expect(Array.from(state.checkedKeys)).toEqual(["manual:coffee"]);
    expect(selectIsDemoMode(state)).toBe(false);
  });

  it("selects remote shopping items when authenticated remote data exists", () => {
    const state = createInitialMiniAppState({
      household: {
        id: "household-1",
        name: "Наша кухня",
        role: "owner",
        members: []
      },
      recipes: [],
      planItems: [],
      shoppingItems: [
        {
          key: "manual:coffee",
          name: "Кофе",
          quantity: 1,
          unit: "шт",
          source: "manual",
          checked: false
        }
      ]
    });

    expect(selectShoppingItems(state)).toEqual(state.remoteShoppingItems);
  });

  it("derives summary counts from state", () => {
    const state = createInitialMiniAppState();
    const shoppingItems = selectShoppingItems(state);

    expect(selectSummaryCounts(state)).toEqual({
      recipesCount: state.recipes.length,
      planItemsCount: state.planItems.length,
      shoppingItemsCount: shoppingItems.length
    });
  });
});
```

- [ ] **Step 2: Run the failing store tests**

Run:

```bash
npm test -- src/frontend/pages/mini-app/model/store.test.ts
```

Expected: FAIL with missing `./selectors` and `./store`.

- [ ] **Step 3: Implement selectors**

Create `src/frontend/pages/mini-app/model/selectors.ts`:

```ts
import { buildShoppingList } from "@/lib/shopping-list";
import type { MiniAppState } from "./types";

export function selectShoppingItems(state: MiniAppState) {
  if (state.authState.status === "ready" && state.remoteShoppingItems) {
    return state.remoteShoppingItems;
  }

  return buildShoppingList({
    recipes: state.recipes,
    planItems: state.planItems,
    manualItems: state.extraItems,
    checkedKeys: Array.from(state.checkedKeys)
  });
}

export function selectSummaryCounts(state: MiniAppState) {
  const shoppingItems = selectShoppingItems(state);

  return {
    recipesCount: state.recipes.length,
    planItemsCount: state.planItems.length,
    shoppingItemsCount: shoppingItems.length
  };
}

export function selectIsDemoMode(state: MiniAppState) {
  return state.authState.status !== "ready";
}
```

- [ ] **Step 4: Implement Zustand store**

Create `src/frontend/pages/mini-app/model/store.ts`:

```ts
import { create } from "zustand";

import { demoManualItems, demoPlan, demoRecipes, demoShoppingList } from "@/data/demo";
import type { ManualShoppingItem, ShoppingListItem } from "@/lib/shopping-list";
import type { MiniAppInitialData, MiniAppState, MiniAppStore, ReadyAuthState } from "./types";

const defaultExtraUnit = "шт";

export function createInitialMiniAppState(initialData?: MiniAppInitialData): MiniAppState {
  if (initialData) {
    return {
      authState: {
        status: "ready",
        initData: "",
        household: {
          id: initialData.household.id,
          name: initialData.household.name,
          role: initialData.household.role
        },
        inviteStatus: "none"
      },
      dataLoading: false,
      dataError: "",
      inviteMessage: "",
      inviteUrl: "",
      inviteLoading: false,
      householdMembers: initialData.household.members,
      recipes: initialData.recipes,
      planItems: initialData.planItems,
      checkedKeys: new Set(initialData.shoppingItems.filter((item) => item.checked).map((item) => item.key)),
      extraItems: mapManualShoppingItems(initialData.shoppingItems),
      extraName: "",
      extraQuantity: "1",
      extraUnit: defaultExtraUnit,
      remoteShoppingItems: initialData.shoppingItems
    };
  }

  return {
    authState: { status: "checking" },
    dataLoading: false,
    dataError: "",
    inviteMessage: "",
    inviteUrl: "",
    inviteLoading: false,
    householdMembers: [],
    recipes: demoRecipes,
    planItems: demoPlan,
    checkedKeys: new Set(demoShoppingList.filter((item) => item.checked).map((item) => item.key)),
    extraItems: demoManualItems,
    extraName: "",
    extraQuantity: "1",
    extraUnit: defaultExtraUnit,
    remoteShoppingItems: null
  };
}

export const useMiniAppStore = create<MiniAppStore>((set, get) => ({
  ...createInitialMiniAppState(),
  initialize: (initialData) => set(createInitialMiniAppState(initialData)),
  setAuthState: (authState) => set({ authState }),
  setDemoAuth: () => set({ authState: { status: "demo", message: "Демо режим" } }),
  setDataLoading: (dataLoading) => set({ dataLoading }),
  setDataError: (dataError) => set({ dataError }),
  setInviteMessage: (inviteMessage) => set({ inviteMessage }),
  setInviteUrl: (inviteUrl) => set({ inviteUrl }),
  setInviteLoading: (inviteLoading) => set({ inviteLoading }),
  setHouseholdMembers: (householdMembers) => set({ householdMembers }),
  setRecipes: (recipes) => set({ recipes }),
  addRecipe: (recipe) => set((state) => ({ recipes: [...state.recipes, recipe] })),
  setPlanItems: (planItems) => set({ planItems }),
  addPlanItem: (item) => set((state) => ({ planItems: [...state.planItems, item] })),
  replacePlanItem: (id, item) => set((state) => ({ planItems: state.planItems.map((current) => (current.id === id ? item : current)) })),
  updatePlanItemServings: (id, servingsMultiplier) => {
    const previousItem = get().planItems.find((item) => item.id === id);
    set((state) => ({ planItems: state.planItems.map((item) => (item.id === id ? { ...item, servingsMultiplier } : item)) }));
    return previousItem;
  },
  removePlanItem: (id) => {
    const previousItem = get().planItems.find((item) => item.id === id);
    set((state) => ({ planItems: state.planItems.filter((item) => item.id !== id) }));
    return previousItem;
  },
  restorePlanItem: (item) => set((state) => ({ planItems: [...state.planItems, item] })),
  setCheckedKeys: (checkedKeys) => set({ checkedKeys }),
  toggleLocalCheckedKey: (key) =>
    set((state) => {
      const next = new Set(state.checkedKeys);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return { checkedKeys: next };
    }),
  setExtraItems: (extraItems) => set({ extraItems }),
  addExtraItem: (item) => set((state) => ({ extraItems: [...state.extraItems, item] })),
  updateExtraItemQuantity: (id, quantity) => set((state) => ({ extraItems: state.extraItems.map((item) => (item.id === id ? { ...item, quantity } : item)) })),
  setExtraName: (extraName) => set({ extraName }),
  setExtraQuantity: (extraQuantity) => set({ extraQuantity }),
  setExtraUnit: (extraUnit) => set({ extraUnit }),
  resetExtraForm: () => set({ extraName: "", extraQuantity: "1", extraUnit: defaultExtraUnit }),
  setRemoteShoppingItems: (remoteShoppingItems) => set({ remoteShoppingItems }),
  updateRemoteShoppingItemChecked: (key, checked) =>
    set((state) => ({
      remoteShoppingItems: state.remoteShoppingItems ? state.remoteShoppingItems.map((item) => (item.key === key ? { ...item, checked } : item)) : state.remoteShoppingItems
    })),
  updateRemoteManualQuantity: (id, quantity) =>
    set((state) => ({
      remoteShoppingItems: state.remoteShoppingItems ? state.remoteShoppingItems.map((item) => (item.key === `manual:${id}` ? { ...item, quantity } : item)) : state.remoteShoppingItems
    })),
  clearAuthenticatedClientData: (authState) =>
    set({
      authState,
      recipes: [],
      planItems: [],
      checkedKeys: new Set(),
      extraItems: [],
      remoteShoppingItems: []
    })
}));

export function resetMiniAppStore(initialData?: MiniAppInitialData) {
  useMiniAppStore.setState(createInitialMiniAppState(initialData), true);
}

export function applyLoadedShoppingItems(items: ShoppingListItem[]) {
  useMiniAppStore.setState({
    remoteShoppingItems: items,
    checkedKeys: new Set(items.filter((item) => item.checked).map((item) => item.key)),
    extraItems: mapManualShoppingItems(items)
  });
}

function mapManualShoppingItems(items: ShoppingListItem[]): ManualShoppingItem[] {
  return items.filter((item) => item.source === "manual").map((item) => ({ id: item.key.replace("manual:", ""), name: item.name, quantity: item.quantity, unit: item.unit }));
}
```

- [ ] **Step 5: Run store tests**

Run:

```bash
npm test -- src/frontend/pages/mini-app/model/store.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit model store and selector foundation**

Run:

```bash
git add src/frontend/pages/mini-app/model src/frontend/pages/mini-app/index.ts
git commit -m "Add Mini App Zustand store foundation"
```

---

### Task 3: Add Workflow Tests and Async Workflow Layer

**Files:**
- Create: `src/frontend/pages/mini-app/model/workflows.test.ts`
- Create: `src/frontend/pages/mini-app/model/workflows.ts`
- Modify: `src/frontend/pages/mini-app/model/store.ts`

- [ ] **Step 1: Write failing workflow tests**

Create `src/frontend/pages/mini-app/model/workflows.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { demoWeekDates } from "@/data/demo";
import { selectShoppingItems } from "./selectors";
import { resetMiniAppStore, useMiniAppStore } from "./store";
import { addMeal, bootstrapTelegramAuth, toggleShoppingItem } from "./workflows";
import type { WorkflowDependencies } from "./types";

describe("Mini App workflows", () => {
  beforeEach(() => {
    resetMiniAppStore();
  });

  it("loads authenticated household data after Telegram bootstrap", async () => {
    const deps = createWorkflowDependencies({
      launchParams: { initData: "query_id=abc", inviteToken: "invite-1" },
      recipes: [
        {
          id: "recipe-1",
          title: "Омлет",
          instructions: "Взбить яйца.",
          servings: 2,
          ingredients: [{ productId: "egg", name: "Яйца", quantity: 4, unit: "шт" }]
        }
      ],
      shopping: [
        {
          key: "manual:coffee",
          name: "Кофе",
          quantity: 1,
          unit: "шт",
          source: "manual",
          checked: true
        }
      ]
    });

    await bootstrapTelegramAuth(undefined, deps);

    const state = useMiniAppStore.getState();
    expect(state.authState.status).toBe("ready");
    expect(state.recipes).toHaveLength(1);
    expect(state.remoteShoppingItems).toHaveLength(1);
    expect(Array.from(state.checkedKeys)).toEqual(["manual:coffee"]);
    expect(state.extraItems).toEqual([{ id: "coffee", name: "Кофе", quantity: 1, unit: "шт" }]);
  });

  it("rolls back optimistic meal add when the action fails", async () => {
    resetMiniAppStore({
      household: {
        id: "household-1",
        name: "Наша кухня",
        role: "owner",
        members: []
      },
      recipes: [
        {
          id: "recipe-1",
          title: "Омлет",
          instructions: "Взбить яйца.",
          servings: 2,
          ingredients: [{ productId: "egg", name: "Яйца", quantity: 4, unit: "шт" }]
        }
      ],
      planItems: [],
      shoppingItems: []
    });
    const deps = createWorkflowDependencies({
      createMealPlanItemResult: { error: "Не удалось обновить план" }
    });

    await addMeal({ date: demoWeekDates[0], slot: "breakfast", recipeId: "recipe-1" }, deps);

    expect(useMiniAppStore.getState().planItems).toHaveLength(0);
    expect(useMiniAppStore.getState().dataError).toBe("Не удалось добавить рецепт в план");
  });

  it("rolls back optimistic shopping toggle when the action fails", async () => {
    resetMiniAppStore({
      household: {
        id: "household-1",
        name: "Наша кухня",
        role: "owner",
        members: []
      },
      recipes: [],
      planItems: [],
      shoppingItems: [
        {
          key: "manual:coffee",
          name: "Кофе",
          quantity: 1,
          unit: "шт",
          source: "manual",
          checked: false
        }
      ]
    });
    const deps = createWorkflowDependencies({
      updateShoppingCheckStateResult: { error: "Не удалось обновить список покупок" }
    });

    await toggleShoppingItem("manual:coffee", deps);

    expect(selectShoppingItems(useMiniAppStore.getState())[0].checked).toBe(false);
    expect(useMiniAppStore.getState().dataError).toBe("Не удалось обновить список покупок");
  });
});

function createWorkflowDependencies({
  launchParams = {},
  recipes = [],
  plan = [],
  shopping = [],
  createMealPlanItemResult = {
    item: {
      id: "remote-plan",
      date: demoWeekDates[0],
      slot: "breakfast",
      recipeId: "recipe-1",
      servingsMultiplier: 1
    }
  },
  updateShoppingCheckStateResult = { checkState: { itemKey: "manual:coffee", checked: true } }
}: {
  launchParams?: { initData?: string; inviteToken?: string };
  recipes?: unknown[];
  plan?: unknown[];
  shopping?: unknown[];
  createMealPlanItemResult?: Awaited<ReturnType<WorkflowDependencies["createMealPlanItemAction"]>>;
  updateShoppingCheckStateResult?: Awaited<ReturnType<WorkflowDependencies["updateShoppingCheckStateAction"]>>;
} = {}): WorkflowDependencies {
  return {
    fetch: vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/auth/telegram") {
        return jsonResponse({
          household: {
            id: "household-1",
            name: "Наша кухня",
            role: "owner"
          },
          inviteStatus: "none"
        });
      }

      if (url === "/api/household") {
        return jsonResponse({ household: { members: [] } });
      }

      if (url === "/api/recipes") {
        return jsonResponse({ recipes });
      }

      if (url.startsWith("/api/meal-plans")) {
        return jsonResponse({ plan });
      }

      if (url.startsWith("/api/shopping-list")) {
        return jsonResponse({ items: shopping });
      }

      return jsonResponse({}, false);
    }) as WorkflowDependencies["fetch"],
    getTelegramLaunchParams: () => launchParams,
    clipboard: undefined,
    now: () => 1000,
    createInviteAction: vi.fn(),
    createManualShoppingItemAction: vi.fn(),
    createMealPlanItemAction: vi.fn(async () => createMealPlanItemResult),
    createRecipeAction: vi.fn(),
    deleteMealPlanItemAction: vi.fn(),
    updateMealPlanItemAction: vi.fn(),
    updateShoppingCheckStateAction: vi.fn(async () => updateShoppingCheckStateResult)
  };
}

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    json: async () => body
  } as Response;
}
```

- [ ] **Step 2: Run failing workflow tests**

Run:

```bash
npm test -- src/frontend/pages/mini-app/model/workflows.test.ts
```

Expected: FAIL with missing `./workflows`.

- [ ] **Step 3: Implement workflow layer**

Create `src/frontend/pages/mini-app/model/workflows.ts`:

```ts
import {
  createInviteAction,
  createManualShoppingItemAction,
  createMealPlanItemAction,
  createRecipeAction,
  deleteMealPlanItemAction,
  updateMealPlanItemAction,
  updateShoppingCheckStateAction
} from "@/app/actions";
import { demoWeekDates } from "@/data/demo";
import { createProductKey } from "@/shared/lib/product-key";
import { getTelegramLaunchParams } from "@/shared/lib/telegram-launch";
import { selectShoppingItems } from "./selectors";
import { applyLoadedShoppingItems, useMiniAppStore } from "./store";
import type { AddMealInput, AddRecipeInput, ReadyAuthState, WorkflowDependencies } from "./types";

export const browserWorkflowDependencies: WorkflowDependencies = {
  fetch: globalThis.fetch.bind(globalThis),
  getTelegramLaunchParams,
  clipboard: typeof navigator === "undefined" ? undefined : navigator.clipboard,
  now: () => Date.now(),
  createInviteAction,
  createManualShoppingItemAction,
  createMealPlanItemAction,
  createRecipeAction,
  deleteMealPlanItemAction,
  updateMealPlanItemAction,
  updateShoppingCheckStateAction
};

export async function bootstrapTelegramAuth(initialData: unknown, deps: WorkflowDependencies = browserWorkflowDependencies) {
  const launchParams = deps.getTelegramLaunchParams();

  if (!launchParams.initData) {
    if (initialData) {
      return;
    }

    useMiniAppStore.getState().setDemoAuth();
    return;
  }

  try {
    const response = await deps.fetch("/api/auth/telegram", {
      method: "POST",
      headers: {
        authorization: `tma ${launchParams.initData}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ inviteToken: launchParams.inviteToken })
    });

    if (!response.ok) {
      throw new Error("Auth failed");
    }

    const result = (await response.json()) as ReadyAuthState;
    const readyAuth: ReadyAuthState = {
      status: "ready",
      initData: launchParams.initData,
      household: result.household,
      inviteStatus: result.inviteStatus
    };

    useMiniAppStore.getState().clearAuthenticatedClientData(readyAuth);
    await loadHouseholdData(readyAuth, deps);
  } catch {
    useMiniAppStore.getState().setAuthState({
      status: "error",
      message: "Не удалось войти через Telegram"
    });
  }
}

export async function loadHouseholdData(auth: ReadyAuthState, deps: WorkflowDependencies = browserWorkflowDependencies) {
  const store = useMiniAppStore.getState();
  store.setDataLoading(true);
  store.setDataError("");

  try {
    const [householdResponse, recipesResponse, planResponse, shoppingResponse] = await Promise.all([
      deps.fetch("/api/household", { headers: authRequestHeaders(auth) }),
      deps.fetch("/api/recipes", { headers: authRequestHeaders(auth) }),
      deps.fetch(`/api/meal-plans?weekStart=${encodeURIComponent(demoWeekDates[0])}`, { headers: authRequestHeaders(auth) }),
      deps.fetch(`/api/shopping-list?weekStart=${encodeURIComponent(demoWeekDates[0])}`, { headers: authRequestHeaders(auth) })
    ]);

    if (!householdResponse.ok || !recipesResponse.ok || !planResponse.ok || !shoppingResponse.ok) {
      throw new Error("Data loading failed");
    }

    const householdResult = (await householdResponse.json()) as { household?: { members?: ReadyAuthState[] } };
    const recipesResult = (await recipesResponse.json()) as { recipes: ReturnType<typeof useMiniAppStore.getState>["recipes"] };
    const planResult = (await planResponse.json()) as { plan: ReturnType<typeof useMiniAppStore.getState>["planItems"] };
    const shoppingResult = (await shoppingResponse.json()) as { items: ReturnType<typeof selectShoppingItems> };

    const current = useMiniAppStore.getState();
    current.setRecipes(recipesResult.recipes ?? []);
    current.setPlanItems(planResult.plan ?? []);
    current.setHouseholdMembers(householdResult.household?.members ?? []);
    applyLoadedShoppingItems(shoppingResult.items ?? []);
  } catch {
    useMiniAppStore.getState().setDataError("Не удалось загрузить данные пары");
  } finally {
    useMiniAppStore.getState().setDataLoading(false);
  }
}

export async function createInvite(deps: WorkflowDependencies = browserWorkflowDependencies) {
  const store = useMiniAppStore.getState();

  if (store.authState.status !== "ready") {
    store.setInviteMessage("Откройте приложение в Telegram, чтобы создать приглашение");
    return;
  }

  store.setInviteLoading(true);
  store.setInviteMessage("");

  try {
    const result = await deps.createInviteAction();

    if ("error" in result) {
      throw new Error(result.error);
    }

    useMiniAppStore.getState().setInviteUrl(result.invite.url);

    if (deps.clipboard) {
      await deps.clipboard.writeText(result.invite.url);
      useMiniAppStore.getState().setInviteMessage("Ссылка скопирована");
    } else {
      useMiniAppStore.getState().setInviteMessage("Ссылка готова");
    }
  } catch {
    useMiniAppStore.getState().setInviteMessage("Не удалось создать ссылку");
  } finally {
    useMiniAppStore.getState().setInviteLoading(false);
  }
}

export async function toggleShoppingItem(key: string, deps: WorkflowDependencies = browserWorkflowDependencies) {
  const state = useMiniAppStore.getState();
  const shoppingItems = selectShoppingItems(state);

  if (state.authState.status === "ready") {
    const checked = !shoppingItems.some((item) => item.key === key && item.checked);
    const previousRemoteShoppingItems = state.remoteShoppingItems;
    state.updateRemoteShoppingItemChecked(key, checked);

    try {
      const result = await deps.updateShoppingCheckStateAction({
        weekStart: demoWeekDates[0],
        itemKey: key,
        checked
      });

      if ("error" in result) {
        throw new Error(result.error);
      }

      await reloadShoppingList(state.authState, deps);
    } catch {
      useMiniAppStore.getState().setRemoteShoppingItems(previousRemoteShoppingItems);
      useMiniAppStore.getState().setDataError("Не удалось обновить список покупок");
    }

    return;
  }

  state.toggleLocalCheckedKey(key);
}

export async function addManualShoppingItem(deps: WorkflowDependencies = browserWorkflowDependencies) {
  const state = useMiniAppStore.getState();
  const name = state.extraName.trim();
  const quantity = Number(state.extraQuantity);

  if (!name || !Number.isFinite(quantity) || quantity <= 0) {
    return;
  }

  if (state.authState.status === "ready") {
    try {
      const result = await deps.createManualShoppingItemAction({
        weekStart: demoWeekDates[0],
        name,
        quantity,
        unit: state.extraUnit
      });

      if ("error" in result) {
        throw new Error(result.error);
      }

      useMiniAppStore.getState().resetExtraForm();
      await reloadShoppingList(state.authState, deps);
    } catch {
      useMiniAppStore.getState().setDataError("Не удалось добавить продукт");
    }

    return;
  }

  state.addExtraItem({
    id: `${deps.now()}`,
    name,
    quantity,
    unit: state.extraUnit
  });
  useMiniAppStore.getState().resetExtraForm();
}

export async function updateManualShoppingQuantity(id: string, quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return;
  }

  const state = useMiniAppStore.getState();

  if (state.authState.status === "ready") {
    state.updateRemoteManualQuantity(id, quantity);
    return;
  }

  state.updateExtraItemQuantity(id, quantity);
}

export async function addMeal(input: AddMealInput, deps: WorkflowDependencies = browserWorkflowDependencies) {
  const state = useMiniAppStore.getState();

  if (!state.recipes.some((recipe) => recipe.id === input.recipeId)) {
    return;
  }

  if (state.authState.status === "ready") {
    const optimisticId = `optimistic-${input.date}-${input.slot}-${input.recipeId}-${deps.now()}`;
    const optimisticItem = {
      id: optimisticId,
      date: input.date,
      slot: input.slot,
      recipeId: input.recipeId,
      servingsMultiplier: 1
    };

    state.addPlanItem(optimisticItem);

    try {
      const result = await deps.createMealPlanItemAction({
        date: input.date,
        slot: input.slot,
        recipeId: input.recipeId,
        servingsMultiplier: 1
      });

      if ("error" in result) {
        throw new Error(result.error);
      }

      useMiniAppStore.getState().replacePlanItem(optimisticId, result.item);
      await reloadShoppingList(state.authState, deps);
    } catch {
      useMiniAppStore.getState().removePlanItem(optimisticId);
      useMiniAppStore.getState().setDataError("Не удалось добавить рецепт в план");
    }

    return;
  }

  state.addPlanItem({
    id: `${input.date}-${input.slot}-${input.recipeId}-${deps.now()}`,
    date: input.date,
    slot: input.slot,
    recipeId: input.recipeId,
    servingsMultiplier: 1
  });
}

export async function updateMealServings(id: string, servingsMultiplier: number, deps: WorkflowDependencies = browserWorkflowDependencies) {
  if (!Number.isFinite(servingsMultiplier) || servingsMultiplier <= 0) {
    return;
  }

  const state = useMiniAppStore.getState();

  if (state.authState.status === "ready") {
    const previousItem = state.updatePlanItemServings(id, servingsMultiplier);

    try {
      const result = await deps.updateMealPlanItemAction({ itemId: id, servingsMultiplier });

      if ("error" in result) {
        throw new Error(result.error);
      }

      useMiniAppStore.getState().replacePlanItem(id, result.item);
      await reloadShoppingList(state.authState, deps);
    } catch {
      if (previousItem) {
        useMiniAppStore.getState().replacePlanItem(id, previousItem);
      }

      useMiniAppStore.getState().setDataError("Не удалось изменить порции");
    }

    return;
  }

  state.updatePlanItemServings(id, servingsMultiplier);
}

export async function removeMeal(id: string, deps: WorkflowDependencies = browserWorkflowDependencies) {
  const state = useMiniAppStore.getState();

  if (state.authState.status === "ready") {
    const previousItem = state.removePlanItem(id);

    try {
      const result = await deps.deleteMealPlanItemAction({ itemId: id });

      if ("error" in result) {
        throw new Error(result.error);
      }

      await reloadShoppingList(state.authState, deps);
    } catch {
      if (previousItem) {
        useMiniAppStore.getState().restorePlanItem(previousItem);
      }

      useMiniAppStore.getState().setDataError("Не удалось убрать рецепт из плана");
    }

    return;
  }

  state.removePlanItem(id);
}

export async function addRecipe(input: AddRecipeInput, deps: WorkflowDependencies = browserWorkflowDependencies) {
  const state = useMiniAppStore.getState();
  const trimmedTitle = input.title.trim();
  const trimmedInstructions = input.instructions.trim();
  const validIngredients = input.ingredients
    .map((ingredient) => ({
      ...ingredient,
      name: ingredient.name.trim(),
      unit: ingredient.unit.trim(),
      productId: ingredient.productId?.trim()
    }))
    .filter((ingredient) => ingredient.name && ingredient.unit && Number.isFinite(ingredient.quantity) && ingredient.quantity > 0);

  if (!trimmedTitle || validIngredients.length === 0 || !trimmedInstructions) {
    return false;
  }

  if (state.authState.status === "ready") {
    try {
      const result = await deps.createRecipeAction({
        title: trimmedTitle,
        instructions: trimmedInstructions,
        servings: 2,
        ingredients: validIngredients.map((ingredient) => ({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit
        }))
      });

      if ("error" in result) {
        throw new Error(result.error);
      }

      useMiniAppStore.getState().addRecipe({ ...result.recipe, photoUrl: input.photoUrl });
      await reloadShoppingList(state.authState, deps);
      return true;
    } catch {
      useMiniAppStore.getState().setDataError("Не удалось добавить рецепт");
      return false;
    }
  }

  useMiniAppStore.getState().addRecipe({
    id: createRecipeId(trimmedTitle, state.recipes),
    title: trimmedTitle,
    instructions: trimmedInstructions,
    photoUrl: input.photoUrl,
    ingredients: validIngredients.map((ingredient) => ({
      ...ingredient,
      productId: ingredient.productId || createProductKey(ingredient.name)
    }))
  });
  return true;
}

async function reloadShoppingList(auth: ReadyAuthState, deps: WorkflowDependencies) {
  const response = await deps.fetch(`/api/shopping-list?weekStart=${encodeURIComponent(demoWeekDates[0])}`, {
    headers: authRequestHeaders(auth)
  });

  if (!response.ok) {
    throw new Error("Shopping reload failed");
  }

  const result = (await response.json()) as { items: ReturnType<typeof selectShoppingItems> };
  applyLoadedShoppingItems(result.items);
}

function createRecipeId(title: string, recipes: ReturnType<typeof useMiniAppStore.getState>["recipes"]) {
  const baseId = createProductKey(title) || "recipe";
  const existingIds = new Set(recipes.map((recipe) => recipe.id));
  let nextId = baseId;
  let index = 2;

  while (existingIds.has(nextId)) {
    nextId = `${baseId}-${index}`;
    index += 1;
  }

  return nextId;
}

function authRequestHeaders(auth: ReadyAuthState) {
  return {
    ...(auth.initData ? { authorization: `tma ${auth.initData}` } : {})
  };
}
```

- [ ] **Step 4: Fix concrete TypeScript type issues in workflow implementation**

If `npx tsc --noEmit` reports that `householdResult.household.members` is typed incorrectly, replace this line:

```ts
const householdResult = (await householdResponse.json()) as { household?: { members?: ReadyAuthState[] } };
```

with:

```ts
const householdResult = (await householdResponse.json()) as { household?: { members?: import("@/entities/household").HouseholdMemberView[] } };
```

If it reports `ReturnType<typeof selectShoppingItems>` is not usable for JSON result typing, replace:

```ts
const shoppingResult = (await shoppingResponse.json()) as { items: ReturnType<typeof selectShoppingItems> };
```

and:

```ts
const result = (await response.json()) as { items: ReturnType<typeof selectShoppingItems> };
```

with:

```ts
const shoppingResult = (await shoppingResponse.json()) as { items: import("@/entities/shopping-list").ShoppingListItem[] };
```

and:

```ts
const result = (await response.json()) as { items: import("@/entities/shopping-list").ShoppingListItem[] };
```

- [ ] **Step 5: Run workflow tests**

Run:

```bash
npm test -- src/frontend/pages/mini-app/model/workflows.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run model tests together**

Run:

```bash
npm test -- src/frontend/pages/mini-app/model/store.test.ts src/frontend/pages/mini-app/model/workflows.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit workflow layer**

Run:

```bash
git add src/frontend/pages/mini-app/model
git commit -m "Add Mini App state workflows"
```

---

### Task 4: Wire MiniAppPage to Store and Workflows

**Files:**
- Modify: `src/frontend/pages/mini-app/ui/mini-app-page.tsx`
- Modify: `src/app/mini-app.test.tsx`

- [ ] **Step 1: Replace imports in `mini-app-page.tsx`**

Remove these imports from `src/frontend/pages/mini-app/ui/mini-app-page.tsx`:

```ts
import { useMemo, useState } from "react";
import {
  createInviteAction,
  createManualShoppingItemAction,
  createMealPlanItemAction,
  createRecipeAction,
  deleteMealPlanItemAction,
  updateMealPlanItemAction,
  updateShoppingCheckStateAction
} from "@/app/actions";
import { demoManualItems, demoPlan, demoProducts, demoRecipes, demoShoppingList, demoWeekDates, type MealSlot, type PlannedMeal } from "@/data/demo";
import type { HouseholdMemberView } from "@/entities/household";
import type { AppRecipe } from "@/entities/recipe";
import { buildShoppingList, type ManualShoppingItem, type RecipeIngredient, type ShoppingListItem } from "@/lib/shopping-list";
import { createProductKey } from "@/shared/lib/product-key";
import { getTelegramLaunchParams } from "@/shared/lib/telegram-launch";
```

Add these imports:

```ts
import { useEffect, useState } from "react";

import { demoProducts } from "@/data/demo";
import type { MealSlot } from "@/data/demo";
import type { RecipeIngredient } from "@/lib/shopping-list";
import {
  addManualShoppingItem,
  addMeal,
  addRecipe,
  bootstrapTelegramAuth,
  createInvite,
  removeMeal,
  resetMiniAppStore,
  selectShoppingItems,
  selectSummaryCounts,
  toggleShoppingItem,
  updateManualShoppingQuantity,
  updateMealServings,
  useMiniAppStore,
  type MiniAppInitialData
} from "@/frontend/pages/mini-app/model";
```

- [ ] **Step 2: Remove local type declarations from `mini-app-page.tsx`**

Delete the local `InviteStatus`, `AuthState`, and `MiniAppInitialData` declarations. Keep:

```ts
type Tab = MiniAppTab;
```

- [ ] **Step 3: Replace local state block with Zustand selectors**

Replace the `useState` declarations from `authState` through `remoteShoppingItems` with:

```ts
  const authState = useMiniAppStore((state) => state.authState);
  const dataLoading = useMiniAppStore((state) => state.dataLoading);
  const dataError = useMiniAppStore((state) => state.dataError);
  const inviteMessage = useMiniAppStore((state) => state.inviteMessage);
  const inviteUrl = useMiniAppStore((state) => state.inviteUrl);
  const inviteLoading = useMiniAppStore((state) => state.inviteLoading);
  const householdMembers = useMiniAppStore((state) => state.householdMembers);
  const recipes = useMiniAppStore((state) => state.recipes);
  const planItems = useMiniAppStore((state) => state.planItems);
  const extraName = useMiniAppStore((state) => state.extraName);
  const extraQuantity = useMiniAppStore((state) => state.extraQuantity);
  const extraUnit = useMiniAppStore((state) => state.extraUnit);
  const setExtraName = useMiniAppStore((state) => state.setExtraName);
  const setExtraQuantity = useMiniAppStore((state) => state.setExtraQuantity);
  const setExtraUnit = useMiniAppStore((state) => state.setExtraUnit);
  const shoppingItems = useMiniAppStore(selectShoppingItems);
  const summaryCounts = useMiniAppStore(selectSummaryCounts);
```

- [ ] **Step 4: Initialize the store and bootstrap auth**

Add this effect before the existing Telegram launch effect, then delete the old inline Telegram launch effect body:

```ts
  useEffect(() => {
    resetMiniAppStore(initialData);
    void bootstrapTelegramAuth(initialData);
  }, [initialData]);
```

Keep the URL `popstate` effect unchanged.

- [ ] **Step 5: Replace local handler implementations**

Replace `createInvite`, `toggleItem`, `addExtraItem`, `updateExtraItemQuantity`, `addMeal`, `updateMealServings`, `removeMeal`, and `addRecipe` local functions with thin wrappers:

```ts
  function handleCreateInvite() {
    void createInvite();
  }

  function handleToggleItem(key: string) {
    void toggleShoppingItem(key);
  }

  function handleAddExtraItem() {
    void addManualShoppingItem();
  }

  function handleManualQuantityChange(id: string, quantity: number) {
    void updateManualShoppingQuantity(id, quantity);
  }

  function handleAddMeal(date: string, slot: MealSlot, recipeId: string) {
    void addMeal({ date, slot, recipeId });
  }

  function handleUpdateMealServings(id: string, servingsMultiplier: number) {
    void updateMealServings(id, servingsMultiplier);
  }

  function handleRemoveMeal(id: string) {
    void removeMeal(id);
  }

  function handleAddRecipe(title: string, ingredients: RecipeIngredient[], instructions: string, photoUrl?: string) {
    return addRecipe({ title, ingredients, instructions, photoUrl });
  }
```

- [ ] **Step 6: Update JSX prop wiring**

Change:

```tsx
<AppHeader recipesCount={recipes.length} planItemsCount={planItems.length} shoppingItemsCount={shoppingItems.length} onOpenFamily={openFamily} />
```

to:

```tsx
<AppHeader recipesCount={summaryCounts.recipesCount} planItemsCount={summaryCounts.planItemsCount} shoppingItemsCount={summaryCounts.shoppingItemsCount} onOpenFamily={openFamily} />
```

Change handler props:

```tsx
<FamilyPanel ... onCreateInvite={createInvite} ... />
<RecipesPanel ... onAddRecipe={addRecipe} />
<WeekPanel ... onAddMeal={addMeal} onUpdateMealServings={updateMealServings} onRemoveMeal={removeMeal} />
<ShopPanel ... onAddExtraItem={addExtraItem} onManualQuantityChange={updateExtraItemQuantity} onToggleItem={toggleItem} />
```

to:

```tsx
<FamilyPanel ... onCreateInvite={handleCreateInvite} ... />
<RecipesPanel ... onAddRecipe={handleAddRecipe} />
<WeekPanel ... onAddMeal={handleAddMeal} onUpdateMealServings={handleUpdateMealServings} onRemoveMeal={handleRemoveMeal} />
<ShopPanel ... onAddExtraItem={handleAddExtraItem} onManualQuantityChange={handleManualQuantityChange} onToggleItem={handleToggleItem} />
```

- [ ] **Step 7: Delete obsolete helper functions**

Delete these functions from the bottom of `mini-app-page.tsx`:

```ts
function createRecipeId(...)
function authRequestHeaders(...)
```

Keep the `declare global` block only if `shared/lib/telegram-launch` does not already own the Telegram `Window` type. If `npx tsc --noEmit` passes without it, delete the block from the page.

- [ ] **Step 8: Reset store between DOM tests**

In `src/app/mini-app.test.tsx`, add:

```ts
import { resetMiniAppStore } from "@/frontend/pages/mini-app/model";
```

Then add this line inside `afterEach`:

```ts
resetMiniAppStore();
```

- [ ] **Step 9: Run Mini App DOM tests**

Run:

```bash
npm test -- src/app/mini-app.test.tsx
```

Expected: PASS. If a test fails because the store initializes twice in React Strict Mode, guard initialization with a `useRef`:

```ts
const initializedRef = React.useRef(false);

useEffect(() => {
  if (initializedRef.current) {
    return;
  }

  initializedRef.current = true;
  resetMiniAppStore(initialData);
  void bootstrapTelegramAuth(initialData);
}, [initialData]);
```

- [ ] **Step 10: Commit page wiring**

Run:

```bash
git add src/frontend/pages/mini-app/ui/mini-app-page.tsx src/app/mini-app.test.tsx
git commit -m "Wire Mini App page to Zustand model"
```

---

### Task 5: Strengthen FSD and Component Boundary Tests

**Files:**
- Modify: `src/app/fsd-boundary.test.ts`
- Modify: `src/app/component-boundary.test.ts`

- [ ] **Step 1: Extend FSD public API test**

In `src/app/fsd-boundary.test.ts`, add this path to the `publicApis` array:

```ts
"frontend/pages/mini-app/model/index.ts",
```

- [ ] **Step 2: Extend component boundary test**

In `src/app/component-boundary.test.ts`, add:

```ts
const modelStore = readFileSync(join(process.cwd(), "src/frontend/pages/mini-app/model/store.ts"), "utf8");
const modelWorkflows = readFileSync(join(process.cwd(), "src/frontend/pages/mini-app/model/workflows.ts"), "utf8");

expect(modelStore).toContain("zustand");
expect(modelWorkflows).toContain("@/app/actions");
```

The test should still assert:

```ts
expect(publicEntry.startsWith('"use client";')).toBe(false);
expect(clientEntry.startsWith('"use client";')).toBe(true);
```

- [ ] **Step 3: Run boundary tests**

Run:

```bash
npm test -- src/app/fsd-boundary.test.ts src/app/component-boundary.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit boundary tests**

Run:

```bash
git add src/app/fsd-boundary.test.ts src/app/component-boundary.test.ts
git commit -m "Assert Mini App Zustand model boundaries"
```

---

### Task 6: Full Verification and Cleanup

**Files:**
- Inspect: `src/frontend/pages/mini-app/ui/mini-app-page.tsx`
- Inspect: `src/frontend/pages/mini-app/model/*.ts`
- Inspect: `src/app/*.test.tsx`

- [ ] **Step 1: Search for obsolete local state and helpers**

Run:

```bash
rg -n "useState\\(|useMemo\\(|createRecipeId|authRequestHeaders|setRecipes|setPlanItems|setCheckedKeys|setExtraItems|setRemoteShoppingItems" src/frontend/pages/mini-app/ui/mini-app-page.tsx
```

Expected: only `useState` for `activeTab` and `familyOpen` remains. No old state setters or helper functions remain.

- [ ] **Step 2: Search for arbitrary Tailwind additions**

Run:

```bash
rg -n "\\[[^\\]]+\\]|#[0-9a-fA-F]{3,8}" src/frontend/pages/mini-app src/widgets src/features src/entities
```

Expected: no new matches introduced by this refactor.

- [ ] **Step 3: Run type check**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Run production build**

Run:

```bash
npm run build
```

Expected: PASS when local `DATABASE_URL` and PostgreSQL migration environment are available. If it fails with Prisma connection error, record the exact error and run:

```bash
npx prisma generate
npm test
```

Expected: Prisma generate and tests PASS, with build blocked only by database availability.

- [ ] **Step 6: Commit final cleanup if needed**

If Step 1 or Step 2 required cleanup edits, commit them:

```bash
git add src/frontend/pages/mini-app src/app
git commit -m "Clean up Mini App Zustand refactor"
```

- [ ] **Step 7: Final status**

Report:

```text
Implemented Zustand Mini App refactor.
Verification:
- npx tsc --noEmit: PASS
- npm test: PASS
- npm run build: PASS or blocked by <exact database error>
```

---

## Self-Review

- Spec coverage: the plan covers the page-level Zustand store, separated async workflows, preserved URL state, preserved UX, boundary tests, model tests, server actions, and final verification.
- Placeholder scan: the plan contains no placeholder markers and no vague "write tests" steps without concrete code.
- Type consistency: `MiniAppInitialData`, `AuthState`, `ReadyAuthState`, `WorkflowDependencies`, selectors, store reducers, and workflow function names are defined before use and are reused consistently in page wiring.
