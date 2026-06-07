"use server";

import { cookies } from "next/headers";

import { mealPlanCreateSchema, mealPlanUpdateSchema, recipeCreateSchema, shoppingCheckStateSchema, shoppingManualItemSchema } from "@/lib/api-schemas";
import { getHouseholdSessionForTelegramUser, HouseholdSessionError } from "@/lib/household-session";
import { createHouseholdInvite, HouseholdAccessError } from "@/lib/households";
import { createMealPlanItem, deleteMealPlanItem, MealPlanValidationError, updateMealPlanItem } from "@/lib/meal-plans";
import { RecipePhotoValidationError, uploadRecipePhoto } from "@/lib/recipe-photos";
import { createRecipe, RecipeValidationError, updateRecipePhoto } from "@/lib/recipes";
import { readSessionCookieValue, sessionCookieName } from "@/lib/session-cookie";
import { createManualShoppingItem, ShoppingDataValidationError, updateShoppingCheckState } from "@/lib/shopping-data";
import { TelegramAuthError } from "@/lib/telegram-auth";

export type InviteActionState =
  | {
      invite: {
        token: string;
        expiresAt: Date;
        url: string;
      };
      error?: never;
    }
  | {
      invite?: never;
      error: string;
    };

export async function createInviteAction(): Promise<InviteActionState> {
  try {
    const telegramUser = readSessionCookieValue(cookies().get(sessionCookieName)?.value);
    const invite = await createHouseholdInvite(telegramUser);

    return { invite };
  } catch (error) {
    if (error instanceof TelegramAuthError || error instanceof HouseholdAccessError) {
      return { error: "Не удалось создать ссылку" };
    }

    return { error: "Не удалось создать ссылку" };
  }
}

export type ShoppingCheckActionInput = {
  weekStart: string;
  itemKey: string;
  checked: boolean;
};

export type ShoppingCheckActionState =
  | {
      checkState: {
        itemKey: string;
        checked: boolean;
      };
      error?: never;
    }
  | {
      checkState?: never;
      error: string;
    };

export async function updateShoppingCheckStateAction(input: ShoppingCheckActionInput): Promise<ShoppingCheckActionState> {
  try {
    const telegramUser = readSessionCookieValue(cookies().get(sessionCookieName)?.value);
    const session = await getHouseholdSessionForTelegramUser(telegramUser);
    const checkState = await updateShoppingCheckState(session.householdId, shoppingCheckStateSchema.parse(input));

    return { checkState };
  } catch (error) {
    if (error instanceof TelegramAuthError || error instanceof HouseholdSessionError || error instanceof ShoppingDataValidationError) {
      return { error: "Не удалось обновить список покупок" };
    }

    return { error: "Не удалось обновить список покупок" };
  }
}

export type ManualShoppingItemActionInput = {
  weekStart: string;
  name: string;
  quantity: number;
  unit: string;
};

export type ManualShoppingItemActionState =
  | {
      item: {
        id: string;
        name: string;
        quantity: number;
        unit: string;
      };
      error?: never;
    }
  | {
      item?: never;
      error: string;
    };

export async function createManualShoppingItemAction(input: ManualShoppingItemActionInput): Promise<ManualShoppingItemActionState> {
  try {
    const telegramUser = readSessionCookieValue(cookies().get(sessionCookieName)?.value);
    const session = await getHouseholdSessionForTelegramUser(telegramUser);
    const item = await createManualShoppingItem(session.householdId, shoppingManualItemSchema.parse(input));

    return { item };
  } catch (error) {
    if (error instanceof TelegramAuthError || error instanceof HouseholdSessionError || error instanceof ShoppingDataValidationError) {
      return { error: "Не удалось добавить продукт" };
    }

    return { error: "Не удалось добавить продукт" };
  }
}

export type RecipeCreateActionInput = {
  title: string;
  instructions: string;
  sourceUrl?: string;
  servings?: number;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
};

export type RecipeActionItem = {
  id: string;
  title: string;
  instructions: string;
  servings: number;
  photoUrl?: string | null;
  sourceUrl?: string | null;
  ingredients: Array<{
    productId?: string;
    name: string;
    quantity: number;
    unit: string;
  }>;
};

export type RecipeCreateActionState =
  | {
      recipe: RecipeActionItem;
      error?: never;
    }
  | {
      recipe?: never;
      error: string;
    };

export async function createRecipeAction(input: RecipeCreateActionInput, photoForm?: FormData): Promise<RecipeCreateActionState> {
  try {
    const session = await getActionSession();
    const photoFile = getRecipePhotoFile(photoForm);
    const photoObjectKey = photoFile ? await uploadRecipePhoto(session.householdId, photoFile) : undefined;
    const recipe = await createRecipe(session.householdId, { ...recipeCreateSchema.parse(input), ...(photoObjectKey ? { photoObjectKey } : {}) });

    return { recipe };
  } catch (error) {
    if (error instanceof TelegramAuthError || error instanceof HouseholdSessionError || error instanceof RecipeValidationError || error instanceof RecipePhotoValidationError) {
      return { error: "Не удалось добавить рецепт" };
    }

    return { error: "Не удалось добавить рецепт" };
  }
}

export type RecipePhotoUpdateActionInput = {
  recipeId: string;
};

export type RecipePhotoUpdateActionState =
  | {
      recipe: RecipeActionItem;
      error?: never;
    }
  | {
      recipe?: never;
      error: string;
    };

export async function updateRecipePhotoAction(input: RecipePhotoUpdateActionInput, photoForm: FormData): Promise<RecipePhotoUpdateActionState> {
  try {
    const session = await getActionSession();
    const recipeId = input.recipeId.trim();
    const photoFile = getRecipePhotoFile(photoForm);

    if (!recipeId || !photoFile) {
      return { error: "Не удалось обновить фото" };
    }

    const recipe = await updateRecipePhoto(session.householdId, recipeId, photoFile);

    if (!recipe) {
      return { error: "Не удалось обновить фото" };
    }

    return { recipe };
  } catch (error) {
    if (error instanceof TelegramAuthError || error instanceof HouseholdSessionError || error instanceof RecipeValidationError || error instanceof RecipePhotoValidationError) {
      return { error: "Не удалось обновить фото" };
    }

    return { error: "Не удалось обновить фото" };
  }
}

export type MealPlanCreateActionInput = {
  date: string;
  slot: "breakfast" | "lunch" | "snack" | "dinner";
  recipeId: string;
  servingsMultiplier: number;
};

export type MealPlanUpdateActionInput = {
  itemId: string;
  servingsMultiplier: number;
};

export type MealPlanDeleteActionInput = {
  itemId: string;
};

type MealPlanActionItem = {
  id: string;
  date: string;
  slot: "breakfast" | "lunch" | "snack" | "dinner";
  recipeId: string;
  servingsMultiplier: number;
};

export type MealPlanItemActionState =
  | {
      item: MealPlanActionItem;
      error?: never;
    }
  | {
      item?: never;
      error: string;
    };

export type MealPlanDeleteActionState =
  | {
      deleted: true;
      error?: never;
    }
  | {
      deleted?: never;
      error: string;
    };

export async function createMealPlanItemAction(input: MealPlanCreateActionInput): Promise<MealPlanItemActionState> {
  try {
    const session = await getActionSession();
    const item = await createMealPlanItem(session.householdId, mealPlanCreateSchema.parse(input));

    return { item };
  } catch (error) {
    return handleMealPlanActionError(error);
  }
}

export async function updateMealPlanItemAction(input: MealPlanUpdateActionInput): Promise<MealPlanItemActionState> {
  try {
    const session = await getActionSession();
    const parsed = mealPlanUpdateSchema.parse({ servingsMultiplier: input.servingsMultiplier });
    const item = await updateMealPlanItem(session.householdId, input.itemId, parsed.servingsMultiplier);

    if (!item) {
      return { error: "Не удалось обновить план" };
    }

    return { item };
  } catch (error) {
    return handleMealPlanActionError(error);
  }
}

export async function deleteMealPlanItemAction(input: MealPlanDeleteActionInput): Promise<MealPlanDeleteActionState> {
  try {
    const session = await getActionSession();
    const deleted = await deleteMealPlanItem(session.householdId, input.itemId);

    if (!deleted) {
      return { error: "Не удалось обновить план" };
    }

    return { deleted: true };
  } catch (error) {
    if (error instanceof TelegramAuthError || error instanceof HouseholdSessionError || error instanceof MealPlanValidationError) {
      return { error: "Не удалось обновить план" };
    }

    return { error: "Не удалось обновить план" };
  }
}

function getRecipePhotoFile(photoForm?: FormData) {
  const file = photoForm?.get("photo");

  if (!(file instanceof File) || file.size === 0) {
    return undefined;
  }

  return file;
}

async function getActionSession() {
  const telegramUser = readSessionCookieValue(cookies().get(sessionCookieName)?.value);
  return getHouseholdSessionForTelegramUser(telegramUser);
}

function handleMealPlanActionError(error: unknown): MealPlanItemActionState {
  if (error instanceof TelegramAuthError || error instanceof HouseholdSessionError || error instanceof MealPlanValidationError) {
    return { error: "Не удалось обновить план" };
  }

  return { error: "Не удалось обновить план" };
}
