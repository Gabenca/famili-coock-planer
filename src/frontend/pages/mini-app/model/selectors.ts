import { buildShoppingList } from "@/lib/shopping-list";
import type { MiniAppState } from "./types";

type LocalShoppingItemsCache = Pick<MiniAppState, "recipes" | "planItems" | "extraItems" | "checkedKeys"> & {
  shoppingItems: ReturnType<typeof buildShoppingList>;
};

let localShoppingItemsCache: LocalShoppingItemsCache | null = null;

export function selectShoppingItems(state: MiniAppState) {
  if (state.authState.status === "ready" && state.remoteShoppingItems) {
    return state.remoteShoppingItems;
  }

  if (
    localShoppingItemsCache &&
    localShoppingItemsCache.recipes === state.recipes &&
    localShoppingItemsCache.planItems === state.planItems &&
    localShoppingItemsCache.extraItems === state.extraItems &&
    localShoppingItemsCache.checkedKeys === state.checkedKeys
  ) {
    return localShoppingItemsCache.shoppingItems;
  }

  const shoppingItems = buildShoppingList({
    recipes: state.recipes,
    planItems: state.planItems,
    manualItems: state.extraItems,
    checkedKeys: Array.from(state.checkedKeys)
  });

  localShoppingItemsCache = {
    recipes: state.recipes,
    planItems: state.planItems,
    extraItems: state.extraItems,
    checkedKeys: state.checkedKeys,
    shoppingItems
  };

  return shoppingItems;
}

export function selectIsDemoMode(state: MiniAppState) {
  return state.authState.status !== "ready";
}

export function selectRecipesCount(state: MiniAppState) {
  return state.recipes.length;
}

export function selectPlanItemsCount(state: MiniAppState) {
  return state.planItems.length;
}

export function selectShoppingItemsCount(state: MiniAppState) {
  return selectShoppingItems(state).length;
}
