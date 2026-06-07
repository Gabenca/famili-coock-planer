import { beforeEach, describe, expect, it, vi } from "vitest";

import { demoWeekDates } from "@/data/demo";
import { selectShoppingItems } from "./selectors";
import { resetMiniAppStore, useMiniAppStore } from "./store";
import type { ReadyAuthState, WorkflowDependencies } from "./types";
import { addMeal, addRecipe, bootstrapTelegramAuth, loadHouseholdData, removeMeal, toggleShoppingItem, updateMealServings, updateRecipePhoto } from "./workflows";

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

  it("keeps created meal when shopping reload fails after successful action", async () => {
    resetReadyStore();
    const deps = createWorkflowDependencies({
      shoppingOk: false,
      createMealPlanItemResult: {
        item: {
          id: "remote-plan",
          date: demoWeekDates[0],
          slot: "breakfast",
          recipeId: "recipe-1",
          servingsMultiplier: 1
        }
      }
    });

    await addMeal({ date: demoWeekDates[0], slot: "breakfast", recipeId: "recipe-1" }, deps);

    expect(useMiniAppStore.getState().planItems).toEqual([
      {
        id: "remote-plan",
        date: demoWeekDates[0],
        slot: "breakfast",
        recipeId: "recipe-1",
        servingsMultiplier: 1
      }
    ]);
    expect(useMiniAppStore.getState().dataError).toBe("Не удалось обновить список покупок");
  });

  it("removes optimistic meal without data error when auth changes before add action resolves", async () => {
    resetReadyStore();
    const nextAuth = readyAuth("household-2", "query_id=new");
    const deferred = createDeferred<Awaited<ReturnType<WorkflowDependencies["createMealPlanItemAction"]>>>();
    const deps = createWorkflowDependencies();
    deps.createMealPlanItemAction = vi.fn(async () => deferred.promise);

    const addPromise = addMeal({ date: demoWeekDates[0], slot: "breakfast", recipeId: "recipe-1" }, deps);
    useMiniAppStore.getState().clearAuthenticatedClientData(nextAuth);
    deferred.resolve({
      item: {
        id: "remote-plan",
        date: demoWeekDates[0],
        slot: "breakfast",
        recipeId: "recipe-1",
        servingsMultiplier: 1
      }
    });
    await addPromise;

    expect(useMiniAppStore.getState().authState).toEqual(nextAuth);
    expect(useMiniAppStore.getState().planItems).toHaveLength(0);
    expect(useMiniAppStore.getState().dataError).toBe("");
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

  it("rolls back only the toggled shopping item when the action fails", async () => {
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
    const deferred = createDeferred<Awaited<ReturnType<WorkflowDependencies["updateShoppingCheckStateAction"]>>>();
    const deps = createWorkflowDependencies();
    deps.updateShoppingCheckStateAction = vi.fn(async () => deferred.promise);

    const togglePromise = toggleShoppingItem("manual:coffee", deps);
    useMiniAppStore.getState().setRemoteShoppingItems([
      ...(useMiniAppStore.getState().remoteShoppingItems ?? []),
      {
        key: "manual:tea",
        name: "Чай",
        quantity: 1,
        unit: "шт",
        source: "manual",
        checked: true
      }
    ]);
    deferred.resolve({ error: "Не удалось обновить список покупок" });
    await togglePromise;

    expect(selectShoppingItems(useMiniAppStore.getState())).toEqual([
      {
        key: "manual:coffee",
        name: "Кофе",
        quantity: 1,
        unit: "шт",
        source: "manual",
        checked: false
      },
      {
        key: "manual:tea",
        name: "Чай",
        quantity: 1,
        unit: "шт",
        source: "manual",
        checked: true
      }
    ]);
  });

  it("leaves new auth shopping state untouched when stale toggle fails", async () => {
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
    const nextAuth = readyAuth("household-2", "query_id=new");
    const deferred = createDeferred<Awaited<ReturnType<WorkflowDependencies["updateShoppingCheckStateAction"]>>>();
    const deps = createWorkflowDependencies();
    deps.updateShoppingCheckStateAction = vi.fn(async () => deferred.promise);

    const togglePromise = toggleShoppingItem("manual:coffee", deps);
    useMiniAppStore.getState().clearAuthenticatedClientData(nextAuth);
    useMiniAppStore.getState().setRemoteShoppingItems([
      {
        key: "manual:coffee",
        name: "Кофе",
        quantity: 1,
        unit: "шт",
        source: "manual",
        checked: true
      }
    ]);
    deferred.resolve({ error: "Не удалось обновить список покупок" });
    await togglePromise;

    expect(useMiniAppStore.getState().authState).toEqual(nextAuth);
    expect(selectShoppingItems(useMiniAppStore.getState())[0].checked).toBe(true);
    expect(useMiniAppStore.getState().dataError).toBe("");
  });

  it("does not overwrite new auth shopping item when stale toggle fails with the same key", async () => {
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
    const nextAuth = readyAuth("household-2", "query_id=new");
    const deferred = createDeferred<Awaited<ReturnType<WorkflowDependencies["updateShoppingCheckStateAction"]>>>();
    const deps = createWorkflowDependencies();
    deps.updateShoppingCheckStateAction = vi.fn(async () => deferred.promise);

    const togglePromise = toggleShoppingItem("manual:coffee", deps);
    useMiniAppStore.getState().clearAuthenticatedClientData(nextAuth);
    useMiniAppStore.getState().setRemoteShoppingItems([
      {
        key: "manual:coffee",
        name: "Кофе",
        quantity: 2,
        unit: "шт",
        source: "manual",
        checked: true
      }
    ]);
    deferred.resolve({ error: "Не удалось обновить список покупок" });
    await togglePromise;

    expect(selectShoppingItems(useMiniAppStore.getState())).toEqual([
      {
        key: "manual:coffee",
        name: "Кофе",
        quantity: 2,
        unit: "шт",
        source: "manual",
        checked: true
      }
    ]);
    expect(useMiniAppStore.getState().dataError).toBe("");
  });

  it("does not overwrite new auth plan item when stale servings update succeeds with the same id", async () => {
    resetMiniAppStore({
      household: {
        id: "household-1",
        name: "Наша кухня",
        role: "owner",
        members: []
      },
      recipes: [],
      planItems: [
        {
          id: "plan-1",
          date: demoWeekDates[0],
          slot: "breakfast",
          recipeId: "recipe-1",
          servingsMultiplier: 1
        }
      ],
      shoppingItems: []
    });
    const nextAuth = readyAuth("household-2", "query_id=new");
    const deferred = createDeferred<Awaited<ReturnType<WorkflowDependencies["updateMealPlanItemAction"]>>>();
    const deps = createWorkflowDependencies();
    deps.updateMealPlanItemAction = vi.fn(async () => deferred.promise);

    const updatePromise = updateMealServings("plan-1", 2, deps);
    useMiniAppStore.getState().clearAuthenticatedClientData(nextAuth);
    useMiniAppStore.getState().setPlanItems([
      {
        id: "plan-1",
        date: demoWeekDates[1],
        slot: "dinner",
        recipeId: "recipe-2",
        servingsMultiplier: 3
      }
    ]);
    deferred.resolve({
      item: {
        id: "plan-1",
        date: demoWeekDates[0],
        slot: "breakfast",
        recipeId: "recipe-1",
        servingsMultiplier: 2
      }
    });
    await updatePromise;

    expect(useMiniAppStore.getState().planItems).toEqual([
      {
        id: "plan-1",
        date: demoWeekDates[1],
        slot: "dinner",
        recipeId: "recipe-2",
        servingsMultiplier: 3
      }
    ]);
    expect(useMiniAppStore.getState().dataError).toBe("");
  });

  it("does not overwrite new auth plan item when stale servings update fails with the same id", async () => {
    resetMiniAppStore({
      household: {
        id: "household-1",
        name: "Наша кухня",
        role: "owner",
        members: []
      },
      recipes: [],
      planItems: [
        {
          id: "plan-1",
          date: demoWeekDates[0],
          slot: "breakfast",
          recipeId: "recipe-1",
          servingsMultiplier: 1
        }
      ],
      shoppingItems: []
    });
    const nextAuth = readyAuth("household-2", "query_id=new");
    const deferred = createDeferred<Awaited<ReturnType<WorkflowDependencies["updateMealPlanItemAction"]>>>();
    const deps = createWorkflowDependencies();
    deps.updateMealPlanItemAction = vi.fn(async () => deferred.promise);

    const updatePromise = updateMealServings("plan-1", 2, deps);
    useMiniAppStore.getState().clearAuthenticatedClientData(nextAuth);
    useMiniAppStore.getState().setPlanItems([
      {
        id: "plan-1",
        date: demoWeekDates[1],
        slot: "dinner",
        recipeId: "recipe-2",
        servingsMultiplier: 3
      }
    ]);
    deferred.resolve({ error: "Не удалось обновить план" });
    await updatePromise;

    expect(useMiniAppStore.getState().planItems).toEqual([
      {
        id: "plan-1",
        date: demoWeekDates[1],
        slot: "dinner",
        recipeId: "recipe-2",
        servingsMultiplier: 3
      }
    ]);
    expect(useMiniAppStore.getState().dataError).toBe("");
  });

  it("does not restore old meal into new auth when stale remove succeeds", async () => {
    resetMiniAppStore({
      household: {
        id: "household-1",
        name: "Наша кухня",
        role: "owner",
        members: []
      },
      recipes: [],
      planItems: [
        {
          id: "plan-1",
          date: demoWeekDates[0],
          slot: "breakfast",
          recipeId: "recipe-1",
          servingsMultiplier: 1
        }
      ],
      shoppingItems: []
    });
    const nextAuth = readyAuth("household-2", "query_id=new");
    const deferred = createDeferred<Awaited<ReturnType<WorkflowDependencies["deleteMealPlanItemAction"]>>>();
    const deps = createWorkflowDependencies();
    deps.deleteMealPlanItemAction = vi.fn(async () => deferred.promise);

    const removePromise = removeMeal("plan-1", deps);
    useMiniAppStore.getState().clearAuthenticatedClientData(nextAuth);
    useMiniAppStore.getState().setPlanItems([
      {
        id: "plan-2",
        date: demoWeekDates[1],
        slot: "dinner",
        recipeId: "recipe-2",
        servingsMultiplier: 1
      }
    ]);
    deferred.resolve({ deleted: true });
    await removePromise;

    expect(useMiniAppStore.getState().planItems).toEqual([
      {
        id: "plan-2",
        date: demoWeekDates[1],
        slot: "dinner",
        recipeId: "recipe-2",
        servingsMultiplier: 1
      }
    ]);
    expect(useMiniAppStore.getState().dataError).toBe("");
  });

  it("does not restore old meal into new auth when stale remove fails", async () => {
    resetMiniAppStore({
      household: {
        id: "household-1",
        name: "Наша кухня",
        role: "owner",
        members: []
      },
      recipes: [],
      planItems: [
        {
          id: "plan-1",
          date: demoWeekDates[0],
          slot: "breakfast",
          recipeId: "recipe-1",
          servingsMultiplier: 1
        }
      ],
      shoppingItems: []
    });
    const nextAuth = readyAuth("household-2", "query_id=new");
    const deferred = createDeferred<Awaited<ReturnType<WorkflowDependencies["deleteMealPlanItemAction"]>>>();
    const deps = createWorkflowDependencies();
    deps.deleteMealPlanItemAction = vi.fn(async () => deferred.promise);

    const removePromise = removeMeal("plan-1", deps);
    useMiniAppStore.getState().clearAuthenticatedClientData(nextAuth);
    useMiniAppStore.getState().setPlanItems([
      {
        id: "plan-2",
        date: demoWeekDates[1],
        slot: "dinner",
        recipeId: "recipe-2",
        servingsMultiplier: 1
      }
    ]);
    deferred.resolve({ error: "Не удалось обновить план" });
    await removePromise;

    expect(useMiniAppStore.getState().planItems).toEqual([
      {
        id: "plan-2",
        date: demoWeekDates[1],
        slot: "dinner",
        recipeId: "recipe-2",
        servingsMultiplier: 1
      }
    ]);
    expect(useMiniAppStore.getState().dataError).toBe("");
  });

  it("does not set data error on new auth when stale recipe create fails", async () => {
    const firstAuth = readyAuth("household-1", "query_id=old");
    const nextAuth = readyAuth("household-2", "query_id=new");
    useMiniAppStore.getState().clearAuthenticatedClientData(firstAuth);
    const deferred = createDeferred<Awaited<ReturnType<WorkflowDependencies["createRecipeAction"]>>>();
    const deps = createWorkflowDependencies();
    deps.createRecipeAction = vi.fn(async () => deferred.promise);

    const addPromise = addRecipe(
      {
        title: "Омлет",
        instructions: "Взбить яйца.",
        ingredients: [{ productId: "egg", name: "Яйца", quantity: 4, unit: "шт" }]
      },
      deps
    );
    useMiniAppStore.getState().clearAuthenticatedClientData(nextAuth);
    deferred.resolve({ error: "Не удалось добавить рецепт" });
    await addPromise;

    expect(useMiniAppStore.getState().authState).toEqual(nextAuth);
    expect(useMiniAppStore.getState().dataError).toBe("");
  });

  it("passes recipe source URL to the create recipe action", async () => {
    resetReadyStore();
    const deps = createWorkflowDependencies();
    deps.createRecipeAction = vi.fn(async () => ({
      recipe: {
        id: "recipe-2",
        title: "Оладьи",
        instructions: "Обжарить.",
        servings: 2,
        sourceUrl: "https://example.com/oladi",
        ingredients: [{ productId: "flour", name: "Мука", quantity: 200, unit: "г" }]
      }
    }));

    await addRecipe(
      {
        title: "Оладьи",
        instructions: "Обжарить.",
        sourceUrl: " https://example.com/oladi ",
        ingredients: [{ productId: "flour", name: "Мука", quantity: 200, unit: "г" }]
      },
      deps
    );

    expect(deps.createRecipeAction).toHaveBeenCalledWith({
      title: "Оладьи",
      instructions: "Обжарить.",
      servings: 2,
      sourceUrl: "https://example.com/oladi",
      ingredients: [{ name: "Мука", quantity: 200, unit: "г" }]
    });
    expect(useMiniAppStore.getState().recipes.at(-1)).toMatchObject({
      title: "Оладьи",
      sourceUrl: "https://example.com/oladi"
    });
  });

  it("passes selected recipe photo files to the create recipe action", async () => {
    resetReadyStore();
    const deps = createWorkflowDependencies();
    const photoFile = new File(["image"], "oladi.webp", { type: "image/webp" });
    deps.createRecipeAction = vi.fn(async () => ({
      recipe: {
        id: "recipe-2",
        title: "Оладьи",
        instructions: "Обжарить.",
        servings: 2,
        photoUrl: "https://photos.example/oladi.webp",
        ingredients: [{ productId: "flour", name: "Мука", quantity: 200, unit: "г" }]
      }
    }));

    await addRecipe(
      {
        title: "Оладьи",
        instructions: "Обжарить.",
        photoFile,
        photoUrl: "blob:local-preview",
        ingredients: [{ productId: "flour", name: "Мука", quantity: 200, unit: "г" }]
      },
      deps
    );

    expect(deps.createRecipeAction).toHaveBeenCalledWith(
      {
        title: "Оладьи",
        instructions: "Обжарить.",
        servings: 2,
        ingredients: [{ name: "Мука", quantity: 200, unit: "г" }]
      },
      expect.any(FormData)
    );
    const submittedForm = vi.mocked(deps.createRecipeAction).mock.calls[0][1] as FormData;
    expect(submittedForm.get("photo")).toBe(photoFile);
    expect(useMiniAppStore.getState().recipes.at(-1)?.photoUrl).toBe("https://photos.example/oladi.webp");
  });

  it("updates recipe photos through the photo action", async () => {
    resetReadyStore();
    const deps = createWorkflowDependencies();
    const photoFile = new File(["image"], "new.webp", { type: "image/webp" });
    deps.updateRecipePhotoAction = vi.fn(async () => ({
      recipe: {
        id: "recipe-1",
        title: "Омлет",
        instructions: "Взбить яйца.",
        servings: 2,
        photoUrl: "https://photos.example/omelette.webp",
        ingredients: [{ productId: "egg", name: "Яйца", quantity: 4, unit: "шт" }]
      }
    }));

    await updateRecipePhoto("recipe-1", photoFile, "blob:replacement", deps);

    expect(deps.updateRecipePhotoAction).toHaveBeenCalledWith({ recipeId: "recipe-1" }, expect.any(FormData));
    const submittedForm = vi.mocked(deps.updateRecipePhotoAction).mock.calls[0][1] as FormData;
    expect(submittedForm.get("photo")).toBe(photoFile);
    expect(useMiniAppStore.getState().recipes[0].photoUrl).toBe("https://photos.example/omelette.webp");
  });

  it("skips applying household data when auth changes before fetch resolves", async () => {
    const firstAuth = readyAuth("household-1", "query_id=old");
    const nextAuth = readyAuth("household-2", "query_id=new");
    useMiniAppStore.getState().clearAuthenticatedClientData(firstAuth);
    const deferred = createDeferred<void>();
    const deps = createWorkflowDependencies({
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
      ],
      fetchDelay: deferred.promise
    });

    const loadPromise = loadHouseholdData(firstAuth, deps);
    useMiniAppStore.getState().clearAuthenticatedClientData(nextAuth);
    deferred.resolve();
    await loadPromise;

    const state = useMiniAppStore.getState();
    expect(state.authState).toEqual(nextAuth);
    expect(state.recipes).toHaveLength(0);
    expect(state.remoteShoppingItems).toEqual([]);
    expect(state.checkedKeys.size).toBe(0);
  });

  it("preserves ready auth and sets data error when household loading fails", async () => {
    const auth = readyAuth("household-1", "query_id=abc");
    useMiniAppStore.getState().clearAuthenticatedClientData(auth);
    const deps = createWorkflowDependencies({ recipesOk: false });

    await loadHouseholdData(auth, deps);

    expect(useMiniAppStore.getState().authState).toEqual(auth);
    expect(useMiniAppStore.getState().dataError).toBe("Не удалось загрузить данные пары");
  });

  it("does not set data error on new auth when stale household loading fails", async () => {
    const firstAuth = readyAuth("household-1", "query_id=old");
    const nextAuth = readyAuth("household-2", "query_id=new");
    useMiniAppStore.getState().clearAuthenticatedClientData(firstAuth);
    const deferred = createDeferred<void>();
    const deps = createWorkflowDependencies({ recipesOk: false, fetchDelay: deferred.promise });

    const loadPromise = loadHouseholdData(firstAuth, deps);
    useMiniAppStore.getState().clearAuthenticatedClientData(nextAuth);
    deferred.resolve();
    await loadPromise;

    expect(useMiniAppStore.getState().authState).toEqual(nextAuth);
    expect(useMiniAppStore.getState().dataError).toBe("");
    expect(useMiniAppStore.getState().dataLoading).toBe(false);
  });
});

function createWorkflowDependencies({
  launchParams = {},
  recipes = [],
  plan = [],
  shopping = [],
  recipesOk = true,
  shoppingOk = true,
  fetchDelay,
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
  recipesOk?: boolean;
  shoppingOk?: boolean;
  fetchDelay?: Promise<void>;
  createMealPlanItemResult?: Awaited<ReturnType<WorkflowDependencies["createMealPlanItemAction"]>>;
  updateShoppingCheckStateResult?: Awaited<ReturnType<WorkflowDependencies["updateShoppingCheckStateAction"]>>;
} = {}): WorkflowDependencies {
  return {
    fetch: vi.fn(async (input: RequestInfo | URL) => {
      await fetchDelay;
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
        return jsonResponse({ recipes }, recipesOk);
      }

      if (url.startsWith("/api/meal-plans")) {
        return jsonResponse({ plan });
      }

      if (url.startsWith("/api/shopping-list")) {
        return jsonResponse({ items: shopping }, shoppingOk);
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
    updateRecipePhotoAction: vi.fn(),
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

function resetReadyStore() {
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
}

function readyAuth(householdId: string, initData: string): ReadyAuthState {
  return {
    status: "ready",
    initData,
    household: {
      id: householdId,
      name: "Наша кухня",
      role: "owner"
    },
    inviteStatus: "none"
  };
}

function createDeferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}
