import { describe, expect, it } from "vitest";

import { demoManualItems, demoPlan, demoRecipes, demoShoppingList } from "@/data/demo";
import { selectIsDemoMode, selectPlanItemsCount, selectRecipesCount, selectShoppingItems, selectShoppingItemsCount } from "./selectors";
import { createInitialMiniAppState, resetMiniAppStore, useMiniAppStore } from "./store";
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

  it("returns stable local shopping item references for unchanged inputs", () => {
    const state = createInitialMiniAppState();
    const firstShoppingItems = selectShoppingItems(state);

    expect(selectShoppingItems(state)).toBe(firstShoppingItems);

    const changedState = {
      ...state,
      checkedKeys: new Set(state.checkedKeys)
    };

    expect(selectShoppingItems(changedState)).not.toBe(firstShoppingItems);
  });

  it("derives primitive summary counts from state", () => {
    const state = createInitialMiniAppState();
    const shoppingItems = selectShoppingItems(state);

    expect(selectRecipesCount(state)).toBe(state.recipes.length);
    expect(selectPlanItemsCount(state)).toBe(state.planItems.length);
    expect(selectShoppingItemsCount(state)).toBe(shoppingItems.length);
  });

  it("isolates initial state from server initial data array mutation", () => {
    const initialData: MiniAppInitialData = {
      household: {
        id: "household-1",
        name: "Наша кухня",
        role: "owner",
        members: []
      },
      recipes: [],
      planItems: [],
      shoppingItems: []
    };
    const state = createInitialMiniAppState(initialData);

    initialData.household.members.push({
      id: "user-1",
      firstName: "Максим",
      lastName: null,
      username: "max",
      role: "owner"
    });
    initialData.recipes.push({
      id: "recipe-1",
      title: "Омлет",
      ingredients: [{ productId: "egg", name: "Яйца", quantity: 4, unit: "шт" }]
    });
    initialData.planItems.push({
      id: "plan-1",
      recipeId: "recipe-1",
      servingsMultiplier: 1,
      date: "2026-06-01",
      slot: "breakfast"
    });
    initialData.shoppingItems.push({
      key: "manual:coffee",
      name: "Кофе",
      quantity: 1,
      unit: "шт",
      source: "manual",
      checked: true
    });

    expect(state.householdMembers).toHaveLength(0);
    expect(state.recipes).toHaveLength(0);
    expect(state.planItems).toHaveLength(0);
    expect(state.remoteShoppingItems).toHaveLength(0);
  });

  it("isolates demo state from demo fixture array mutation", () => {
    const state = createInitialMiniAppState();
    const recipesCount = state.recipes.length;
    const planItemsCount = state.planItems.length;
    const extraItemsCount = state.extraItems.length;

    try {
      demoRecipes.push({
        id: "review-recipe",
        title: "Омлет",
        ingredients: [{ productId: "egg", name: "Яйца", quantity: 4, unit: "шт" }]
      });
      demoPlan.push({
        id: "review-plan",
        recipeId: "review-recipe",
        servingsMultiplier: 1,
        date: "2026-06-01",
        slot: "breakfast"
      });
      demoManualItems.push({
        id: "review-manual",
        name: "Кофе",
        quantity: 1,
        unit: "шт"
      });

      expect(state.recipes).toHaveLength(recipesCount);
      expect(state.planItems).toHaveLength(planItemsCount);
      expect(state.extraItems).toHaveLength(extraItemsCount);
    } finally {
      demoRecipes.pop();
      demoPlan.pop();
      demoManualItems.pop();
    }
  });

  it("keeps store actions usable after reset", () => {
    resetMiniAppStore();

    expect(typeof useMiniAppStore.getState().addRecipe).toBe("function");

    useMiniAppStore.getState().setDemoAuth();

    expect(useMiniAppStore.getState().authState).toEqual({
      status: "demo",
      message: "Демо режим"
    });
  });
});
