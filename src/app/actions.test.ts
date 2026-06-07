import { cookies } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createInviteAction,
  createManualShoppingItemAction,
  createMealPlanItemAction,
  createRecipeAction,
  deleteMealPlanItemAction,
  updateMealPlanItemAction,
  updateShoppingCheckStateAction
} from "./actions";
import { createSessionCookieValue, sessionCookieName } from "@/lib/session-cookie";

const mocks = vi.hoisted(() => ({
  createHouseholdInvite: vi.fn(),
  createManualShoppingItem: vi.fn(),
  createMealPlanItem: vi.fn(),
  createRecipe: vi.fn(),
  deleteMealPlanItem: vi.fn(),
  getHouseholdSessionForTelegramUser: vi.fn(),
  updateMealPlanItem: vi.fn(),
  updateShoppingCheckState: vi.fn()
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn()
}));

vi.mock("@/lib/households", () => ({
  HouseholdAccessError: class HouseholdAccessError extends Error {},
  createHouseholdInvite: mocks.createHouseholdInvite
}));

vi.mock("@/lib/household-session", () => ({
  HouseholdSessionError: class HouseholdSessionError extends Error {},
  getHouseholdSessionForTelegramUser: mocks.getHouseholdSessionForTelegramUser
}));

vi.mock("@/lib/shopping-data", () => ({
  createManualShoppingItem: mocks.createManualShoppingItem,
  ShoppingDataValidationError: class ShoppingDataValidationError extends Error {},
  updateShoppingCheckState: mocks.updateShoppingCheckState
}));

vi.mock("@/lib/meal-plans", () => ({
  MealPlanValidationError: class MealPlanValidationError extends Error {},
  createMealPlanItem: mocks.createMealPlanItem,
  deleteMealPlanItem: mocks.deleteMealPlanItem,
  updateMealPlanItem: mocks.updateMealPlanItem
}));

vi.mock("@/lib/recipes", () => ({
  RecipeValidationError: class RecipeValidationError extends Error {},
  createRecipe: mocks.createRecipe
}));

describe("server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = "test-secret";
  });

  it("creates invites from the signed Telegram session cookie", async () => {
    const cookieValue = createSessionCookieValue({
      telegramId: "42",
      firstName: "Максим",
      lastName: undefined,
      username: "max",
      languageCode: "ru"
    });
    vi.mocked(cookies).mockReturnValue({
      get: (name: string) => (name === sessionCookieName ? { name, value: cookieValue } : undefined)
    } as never);
    mocks.createHouseholdInvite.mockResolvedValue({
      token: "invite-1",
      expiresAt: new Date("2026-06-14T00:00:00.000Z"),
      url: "https://t.me/bot/app?startapp=invite-1"
    });

    await expect(createInviteAction()).resolves.toEqual({
      invite: {
        token: "invite-1",
        expiresAt: new Date("2026-06-14T00:00:00.000Z"),
        url: "https://t.me/bot/app?startapp=invite-1"
      }
    });
    expect(mocks.createHouseholdInvite).toHaveBeenCalledWith({
      telegramId: "42",
      firstName: "Максим",
      lastName: undefined,
      username: "max",
      languageCode: "ru"
    });
  });

  it("returns a user-facing error when invite creation is not authorized", async () => {
    vi.mocked(cookies).mockReturnValue({
      get: () => undefined
    } as never);

    await expect(createInviteAction()).resolves.toEqual({ error: "Не удалось создать ссылку" });
    expect(mocks.createHouseholdInvite).not.toHaveBeenCalled();
  });

  it("updates shopping check state from the signed session cookie", async () => {
    const cookieValue = createSessionCookieValue({
      telegramId: "42",
      firstName: "Максим",
      lastName: undefined,
      username: "max",
      languageCode: "ru"
    });
    vi.mocked(cookies).mockReturnValue({
      get: (name: string) => (name === sessionCookieName ? { name, value: cookieValue } : undefined)
    } as never);
    mocks.getHouseholdSessionForTelegramUser.mockResolvedValue({ householdId: "household-1" });
    mocks.updateShoppingCheckState.mockResolvedValue({ itemKey: "manual:coffee", checked: true });

    await expect(updateShoppingCheckStateAction({ weekStart: "2026-06-08", itemKey: "manual:coffee", checked: true })).resolves.toEqual({
      checkState: { itemKey: "manual:coffee", checked: true }
    });
    expect(mocks.updateShoppingCheckState).toHaveBeenCalledWith("household-1", {
      weekStart: "2026-06-08",
      itemKey: "manual:coffee",
      checked: true
    });
  });

  it("creates manual shopping items from the signed session cookie", async () => {
    const cookieValue = createSessionCookieValue({
      telegramId: "42",
      firstName: "Максим",
      lastName: undefined,
      username: "max",
      languageCode: "ru"
    });
    vi.mocked(cookies).mockReturnValue({
      get: (name: string) => (name === sessionCookieName ? { name, value: cookieValue } : undefined)
    } as never);
    mocks.getHouseholdSessionForTelegramUser.mockResolvedValue({ householdId: "household-1" });
    mocks.createManualShoppingItem.mockResolvedValue({ id: "manual-1", name: "Кофе", quantity: 1, unit: "шт" });

    await expect(createManualShoppingItemAction({ weekStart: "2026-06-08", name: "Кофе", quantity: 1, unit: "шт" })).resolves.toEqual({
      item: { id: "manual-1", name: "Кофе", quantity: 1, unit: "шт" }
    });
    expect(mocks.createManualShoppingItem).toHaveBeenCalledWith("household-1", {
      weekStart: "2026-06-08",
      name: "Кофе",
      quantity: 1,
      unit: "шт"
    });
  });

  it("creates recipes from the signed session cookie", async () => {
    mockSessionCookie();
    mocks.getHouseholdSessionForTelegramUser.mockResolvedValue({ householdId: "household-1" });
    mocks.createRecipe.mockResolvedValue({
      id: "recipe-1",
      title: "Сырники",
      instructions: "Смешать и обжарить.",
      servings: 2,
      photoUrl: null,
      ingredients: [{ productId: "curd", name: "Творог", quantity: 400, unit: "г" }]
    });

    await expect(
      createRecipeAction({
        title: "Сырники",
        instructions: "Смешать и обжарить.",
        servings: 2,
        ingredients: [{ name: "Творог", quantity: 400, unit: "г" }]
      })
    ).resolves.toEqual({
      recipe: {
        id: "recipe-1",
        title: "Сырники",
        instructions: "Смешать и обжарить.",
        servings: 2,
        photoUrl: null,
        ingredients: [{ productId: "curd", name: "Творог", quantity: 400, unit: "г" }]
      }
    });
    expect(mocks.createRecipe).toHaveBeenCalledWith("household-1", {
      title: "Сырники",
      instructions: "Смешать и обжарить.",
      servings: 2,
      ingredients: [{ name: "Творог", quantity: 400, unit: "г" }]
    });
  });

  it("creates meal plan items from the signed session cookie", async () => {
    mockSessionCookie();
    mocks.getHouseholdSessionForTelegramUser.mockResolvedValue({ householdId: "household-1" });
    mocks.createMealPlanItem.mockResolvedValue({ id: "plan-1", date: "2026-06-08", slot: "breakfast", recipeId: "recipe-1", servingsMultiplier: 1 });

    await expect(createMealPlanItemAction({ date: "2026-06-08", slot: "breakfast", recipeId: "recipe-1", servingsMultiplier: 1 })).resolves.toEqual({
      item: { id: "plan-1", date: "2026-06-08", slot: "breakfast", recipeId: "recipe-1", servingsMultiplier: 1 }
    });
    expect(mocks.createMealPlanItem).toHaveBeenCalledWith("household-1", { date: "2026-06-08", slot: "breakfast", recipeId: "recipe-1", servingsMultiplier: 1 });
  });

  it("updates meal plan servings from the signed session cookie", async () => {
    mockSessionCookie();
    mocks.getHouseholdSessionForTelegramUser.mockResolvedValue({ householdId: "household-1" });
    mocks.updateMealPlanItem.mockResolvedValue({ id: "plan-1", date: "2026-06-08", slot: "breakfast", recipeId: "recipe-1", servingsMultiplier: 2 });

    await expect(updateMealPlanItemAction({ itemId: "plan-1", servingsMultiplier: 2 })).resolves.toEqual({
      item: { id: "plan-1", date: "2026-06-08", slot: "breakfast", recipeId: "recipe-1", servingsMultiplier: 2 }
    });
    expect(mocks.updateMealPlanItem).toHaveBeenCalledWith("household-1", "plan-1", 2);
  });

  it("deletes meal plan items from the signed session cookie", async () => {
    mockSessionCookie();
    mocks.getHouseholdSessionForTelegramUser.mockResolvedValue({ householdId: "household-1" });
    mocks.deleteMealPlanItem.mockResolvedValue(true);

    await expect(deleteMealPlanItemAction({ itemId: "plan-1" })).resolves.toEqual({ deleted: true });
    expect(mocks.deleteMealPlanItem).toHaveBeenCalledWith("household-1", "plan-1");
  });
});

function mockSessionCookie() {
  const cookieValue = createSessionCookieValue({
    telegramId: "42",
    firstName: "Максим",
    lastName: undefined,
    username: "max",
    languageCode: "ru"
  });
  vi.mocked(cookies).mockReturnValue({
    get: (name: string) => (name === sessionCookieName ? { name, value: cookieValue } : undefined)
  } as never);
}
