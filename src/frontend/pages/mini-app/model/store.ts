import { create } from "zustand";

import { demoManualItems, demoPlan, demoRecipes, demoShoppingList } from "@/data/demo";
import type { ManualShoppingItem, ShoppingListItem } from "@/entities/shopping-list";
import type { MiniAppInitialData, MiniAppState, MiniAppStore } from "./types";

const defaultExtraUnit = "шт";

export function createInitialMiniAppState(initialData?: MiniAppInitialData): MiniAppState {
  if (initialData) {
    const remoteShoppingItems = [...initialData.shoppingItems];

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
      householdMembers: [...initialData.household.members],
      recipes: [...initialData.recipes],
      planItems: [...initialData.planItems],
      checkedKeys: new Set(remoteShoppingItems.filter((item) => item.checked).map((item) => item.key)),
      extraItems: mapManualShoppingItems(remoteShoppingItems),
      extraName: "",
      extraQuantity: "1",
      extraUnit: defaultExtraUnit,
      remoteShoppingItems
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
    recipes: [...demoRecipes],
    planItems: [...demoPlan],
    checkedKeys: new Set(demoShoppingList.filter((item) => item.checked).map((item) => item.key)),
    extraItems: [...demoManualItems],
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
  clearClientData: () =>
    set({
      recipes: [],
      planItems: [],
      checkedKeys: new Set(),
      extraItems: [],
      remoteShoppingItems: []
    }),
  clearAuthenticatedClientData: (authState) =>
    set({
      authState,
      dataLoading: false,
      dataError: "",
      recipes: [],
      planItems: [],
      checkedKeys: new Set(),
      extraItems: [],
      remoteShoppingItems: []
    })
}));

export function resetMiniAppStore(initialData?: MiniAppInitialData) {
  useMiniAppStore.setState(createInitialMiniAppState(initialData));
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
