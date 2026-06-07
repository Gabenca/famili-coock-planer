import {
  createInviteAction,
  createManualShoppingItemAction,
  createMealPlanItemAction,
  createRecipeAction,
  deleteMealPlanItemAction,
  updateRecipePhotoAction,
  updateMealPlanItemAction,
  updateShoppingCheckStateAction
} from "@/app/actions";
import { demoWeekDates } from "@/data/demo";
import type { HouseholdMemberView } from "@/entities/household";
import type { PlannedMeal } from "@/entities/meal-plan";
import type { AppRecipe } from "@/entities/recipe";
import type { ShoppingListItem } from "@/entities/shopping-list";
import { createProductKey } from "@/shared/lib/product-key";
import { getTelegramLaunchParams } from "@/shared/lib/telegram-launch";
import { selectShoppingItems } from "./selectors";
import { applyLoadedShoppingItems, useMiniAppStore } from "./store";
import type { AddMealInput, AddRecipeInput, ReadyAuthState, WorkflowDependencies } from "./types";

export const browserWorkflowDependencies: WorkflowDependencies = {
  fetch: (...args) => globalThis.fetch(...args),
  getTelegramLaunchParams,
  clipboard: typeof navigator === "undefined" ? undefined : navigator.clipboard,
  now: () => Date.now(),
  createInviteAction,
  createManualShoppingItemAction,
  createMealPlanItemAction,
  createRecipeAction,
  deleteMealPlanItemAction,
  updateRecipePhotoAction,
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

    const householdResult = (await householdResponse.json()) as { household?: { members?: HouseholdMemberView[] } };
    const recipesResult = (await recipesResponse.json()) as { recipes?: AppRecipe[] };
    const planResult = (await planResponse.json()) as { plan?: PlannedMeal[] };
    const shoppingResult = (await shoppingResponse.json()) as { items?: ShoppingListItem[] };

    if (!isCurrentReadyAuth(auth)) {
      return;
    }

    const current = useMiniAppStore.getState();
    current.setRecipes(recipesResult.recipes ?? []);
    current.setPlanItems(planResult.plan ?? []);
    current.setHouseholdMembers(householdResult.household?.members ?? []);
    applyLoadedShoppingItems(shoppingResult.items ?? []);
  } catch {
    if (isCurrentReadyAuth(auth)) {
      useMiniAppStore.getState().setDataError("Не удалось загрузить данные пары");
    }
  } finally {
    if (isCurrentReadyAuth(auth)) {
      useMiniAppStore.getState().setDataLoading(false);
    }
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
    const previousChecked = shoppingItems.find((item) => item.key === key)?.checked ?? false;
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

      if (!isCurrentReadyAuth(state.authState)) {
        return;
      }

      await refreshShoppingList(state.authState, deps);
    } catch {
      if (!isCurrentReadyAuth(state.authState)) {
        return;
      }

      restoreRemoteShoppingItemChecked(key, previousChecked);
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
      await refreshShoppingList(state.authState, deps);
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
    const optimisticItem: PlannedMeal = {
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

      if (!isCurrentReadyAuth(state.authState)) {
        useMiniAppStore.getState().removePlanItem(optimisticId);
        return;
      }

      useMiniAppStore.getState().replacePlanItem(optimisticId, result.item);
      await refreshShoppingList(state.authState, deps);
    } catch {
      useMiniAppStore.getState().removePlanItem(optimisticId);

      if (isCurrentReadyAuth(state.authState)) {
        useMiniAppStore.getState().setDataError("Не удалось добавить рецепт в план");
      }
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

      if (!isCurrentReadyAuth(state.authState)) {
        return;
      }

      useMiniAppStore.getState().replacePlanItem(id, result.item);
      await refreshShoppingList(state.authState, deps);
    } catch {
      if (!isCurrentReadyAuth(state.authState)) {
        return;
      }

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

      if (!isCurrentReadyAuth(state.authState)) {
        return;
      }

      await refreshShoppingList(state.authState, deps);
    } catch {
      if (!isCurrentReadyAuth(state.authState)) {
        return;
      }

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
  const trimmedSourceUrl = input.sourceUrl?.trim();
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
      const recipeInput = {
        title: trimmedTitle,
        instructions: trimmedInstructions,
        ...(trimmedSourceUrl ? { sourceUrl: trimmedSourceUrl } : {}),
        servings: 2,
        ingredients: validIngredients.map((ingredient) => ({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit
        }))
      };
      const photoForm = input.photoFile ? createRecipePhotoForm(input.photoFile) : undefined;
      const result = photoForm ? await deps.createRecipeAction(recipeInput, photoForm) : await deps.createRecipeAction(recipeInput);

      if ("error" in result) {
        throw new Error(result.error);
      }

      if (!isCurrentReadyAuth(state.authState)) {
        return false;
      }

      useMiniAppStore.getState().addRecipe({ ...result.recipe, photoUrl: result.recipe.photoUrl ?? input.photoUrl });
      await refreshShoppingList(state.authState, deps);
      return true;
    } catch {
      if (isCurrentReadyAuth(state.authState)) {
        useMiniAppStore.getState().setDataError("Не удалось добавить рецепт");
      }

      return false;
    }
  }

  useMiniAppStore.getState().addRecipe({
    id: createRecipeId(trimmedTitle, state.recipes),
    title: trimmedTitle,
    instructions: trimmedInstructions,
    sourceUrl: trimmedSourceUrl || undefined,
    photoUrl: input.photoUrl,
    ingredients: validIngredients.map((ingredient) => ({
      ...ingredient,
      productId: ingredient.productId || createProductKey(ingredient.name)
    }))
  });
  return true;
}

export async function updateRecipePhoto(recipeId: string, photoFile: File, photoUrl: string, deps: WorkflowDependencies = browserWorkflowDependencies) {
  const state = useMiniAppStore.getState();

  if (!recipeId || !state.recipes.some((recipe) => recipe.id === recipeId)) {
    return false;
  }

  if (state.authState.status === "ready") {
    try {
      const result = await deps.updateRecipePhotoAction({ recipeId }, createRecipePhotoForm(photoFile));

      if ("error" in result) {
        throw new Error(result.error);
      }

      if (!isCurrentReadyAuth(state.authState)) {
        return false;
      }

      useMiniAppStore.getState().setRecipes(useMiniAppStore.getState().recipes.map((recipe) => (recipe.id === recipeId ? result.recipe : recipe)));
      return true;
    } catch {
      if (isCurrentReadyAuth(state.authState)) {
        useMiniAppStore.getState().setDataError("Не удалось обновить фото");
      }

      return false;
    }
  }

  state.setRecipes(state.recipes.map((recipe) => (recipe.id === recipeId ? { ...recipe, photoUrl } : recipe)));
  return true;
}

async function refreshShoppingList(auth: ReadyAuthState, deps: WorkflowDependencies) {
  try {
    const response = await deps.fetch(`/api/shopping-list?weekStart=${encodeURIComponent(demoWeekDates[0])}`, {
      headers: authRequestHeaders(auth)
    });

    if (!response.ok) {
      throw new Error("Shopping reload failed");
    }

    const result = (await response.json()) as { items?: ShoppingListItem[] };

    if (!isCurrentReadyAuth(auth)) {
      return false;
    }

    applyLoadedShoppingItems(result.items ?? []);
    return true;
  } catch {
    if (isCurrentReadyAuth(auth)) {
      useMiniAppStore.getState().setDataError("Не удалось обновить список покупок");
    }

    return false;
  }
}

function createRecipeId(title: string, recipes: AppRecipe[]) {
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

function createRecipePhotoForm(file: File) {
  const form = new FormData();
  form.set("photo", file);
  return form;
}

function authRequestHeaders(auth: ReadyAuthState) {
  return {
    ...(auth.initData ? { authorization: `tma ${auth.initData}` } : {})
  };
}

function isCurrentReadyAuth(auth: ReadyAuthState) {
  const currentAuth = useMiniAppStore.getState().authState;

  return currentAuth.status === "ready" && currentAuth.initData === auth.initData && currentAuth.household.id === auth.household.id;
}

function restoreRemoteShoppingItemChecked(key: string, checked: boolean) {
  const remoteShoppingItems = useMiniAppStore.getState().remoteShoppingItems;

  if (!remoteShoppingItems) {
    return;
  }

  useMiniAppStore.getState().setRemoteShoppingItems(remoteShoppingItems.map((item) => (item.key === key ? { ...item, checked } : item)));
}
