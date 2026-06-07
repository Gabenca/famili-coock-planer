import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as postTelegramAuth } from "./auth/telegram/route";
import { PATCH as patchMealPlanItem } from "./meal-plans/[itemId]/route";
import { POST as postMealPlan } from "./meal-plans/route";
import { POST as postRecipe } from "./recipes/route";
import { GET as getShoppingList, PATCH as patchShoppingList, POST as postShoppingList } from "./shopping-list/route";

const mocks = vi.hoisted(() => ({
  createManualShoppingItem: vi.fn(),
  createMealPlanItem: vi.fn(),
  createRecipe: vi.fn(),
  bootstrapTelegramUser: vi.fn(),
  getHouseholdSession: vi.fn(),
  getShoppingList: vi.fn(),
  updateMealPlanItem: vi.fn(),
  updateShoppingCheckState: vi.fn()
}));

vi.mock("@/lib/household-session", () => ({
  HouseholdSessionError: class HouseholdSessionError extends Error {},
  getHouseholdSession: mocks.getHouseholdSession
}));

vi.mock("@/lib/telegram-auth", () => ({
  TelegramAuthError: class TelegramAuthError extends Error {}
}));

vi.mock("@/lib/api-auth", () => ({
  getTelegramUserFromRequest: vi.fn(() => ({ id: 42, firstName: "Maxim", lastName: null, username: null })),
  unauthorizedResponse: vi.fn()
}));

vi.mock("@/lib/households", () => ({
  bootstrapTelegramUser: mocks.bootstrapTelegramUser
}));

vi.mock("@/lib/recipes", () => ({
  RecipeValidationError: class RecipeValidationError extends Error {},
  createRecipe: mocks.createRecipe,
  listRecipes: vi.fn()
}));

vi.mock("@/lib/meal-plans", () => ({
  MealPlanValidationError: class MealPlanValidationError extends Error {},
  createMealPlanItem: mocks.createMealPlanItem,
  deleteMealPlanItem: vi.fn(),
  listMealPlan: vi.fn(),
  updateMealPlanItem: mocks.updateMealPlanItem
}));

vi.mock("@/lib/shopping-data", () => ({
  ShoppingDataValidationError: class ShoppingDataValidationError extends Error {},
  createManualShoppingItem: mocks.createManualShoppingItem,
  getShoppingList: mocks.getShoppingList,
  updateShoppingCheckState: mocks.updateShoppingCheckState
}));

describe("API input validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = "test-secret";
    mocks.getHouseholdSession.mockResolvedValue({ householdId: "household-1" });
  });

  it("rejects invalid recipe create input before calling the recipe service", async () => {
    const response = await postRecipe(jsonRequest("/api/recipes", { title: "Сырники", ingredients: [] }));

    expect(response.status).toBe(400);
    expect(mocks.createRecipe).not.toHaveBeenCalled();
  });

  it("rejects invalid recipe source URL before calling the recipe service", async () => {
    const response = await postRecipe(
      jsonRequest("/api/recipes", {
        title: "Сырники",
        instructions: "Смешать и обжарить.",
        sourceUrl: "recipe.example.com",
        ingredients: [{ name: "Творог", quantity: 400, unit: "г" }]
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.createRecipe).not.toHaveBeenCalled();
  });

  it("treats blank recipe source URL as omitted before calling the recipe service", async () => {
    await postRecipe(
      jsonRequest("/api/recipes", {
        title: "Сырники",
        instructions: "Смешать и обжарить.",
        sourceUrl: "   ",
        ingredients: [{ name: "Творог", quantity: 400, unit: "г" }]
      })
    );

    expect(mocks.createRecipe).toHaveBeenCalledWith(
      "household-1",
      expect.objectContaining({
        title: "Сырники",
        sourceUrl: undefined
      })
    );
  });

  it("rejects non-http recipe source URLs before calling the recipe service", async () => {
    const response = await postRecipe(
      jsonRequest("/api/recipes", {
        title: "Сырники",
        instructions: "Смешать и обжарить.",
        sourceUrl: "ftp://example.com/recipe",
        ingredients: [{ name: "Творог", quantity: 400, unit: "г" }]
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.createRecipe).not.toHaveBeenCalled();
  });

  it("rejects invalid meal plan create input before calling the meal plan service", async () => {
    const response = await postMealPlan(
      jsonRequest("/api/meal-plans", {
        date: "2026-06-08",
        slot: "brunch",
        recipeId: "recipe-1",
        servingsMultiplier: 1
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.createMealPlanItem).not.toHaveBeenCalled();
  });

  it("rejects invalid meal plan update input before calling the meal plan service", async () => {
    const response = await patchMealPlanItem(jsonRequest("/api/meal-plans/plan-1", { servingsMultiplier: "many" }), {
      params: { itemId: "plan-1" }
    });

    expect(response.status).toBe(400);
    expect(mocks.updateMealPlanItem).not.toHaveBeenCalled();
  });

  it("rejects invalid shopping list weekStart before loading shopping data", async () => {
    const response = await getShoppingList(new NextRequest("http://localhost/api/shopping-list?weekStart=bad-date"));

    expect(response.status).toBe(400);
    expect(mocks.getShoppingList).not.toHaveBeenCalled();
  });

  it("rejects invalid manual shopping input before calling the shopping service", async () => {
    const response = await postShoppingList(
      jsonRequest("/api/shopping-list", {
        weekStart: "2026-06-08",
        name: "Кофе",
        quantity: 0,
        unit: "шт"
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.createManualShoppingItem).not.toHaveBeenCalled();
  });

  it("rejects invalid shopping check state before calling the shopping service", async () => {
    const response = await patchShoppingList(
      jsonRequest("/api/shopping-list", {
        weekStart: "2026-06-08",
        itemKey: "manual:coffee",
        checked: "yes"
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.updateShoppingCheckState).not.toHaveBeenCalled();
  });

  it("normalizes invalid auth body with zod before bootstrapping Telegram users", async () => {
    mocks.bootstrapTelegramUser.mockResolvedValue({
      user: { id: "user-1", telegramId: "42", firstName: "Maxim", lastName: null, username: null, languageCode: null },
      household: { id: "household-1", name: "Наша кухня", role: "owner" },
      inviteStatus: "none",
      status: "ready"
    });

    const response = await postTelegramAuth(jsonRequest("/api/auth/telegram", { inviteToken: 123 }));

    expect(response.status).toBe(200);
    expect(mocks.bootstrapTelegramUser).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }), undefined);
  });

  it("sets a signed Telegram session cookie after auth bootstrap", async () => {
    mocks.bootstrapTelegramUser.mockResolvedValue({
      user: { id: "user-1", telegramId: "42", firstName: "Maxim", lastName: null, username: "max", languageCode: "ru" },
      household: { id: "household-1", name: "Наша кухня", role: "owner" },
      inviteStatus: "none",
      status: "ready"
    });

    const response = await postTelegramAuth(jsonRequest("/api/auth/telegram", {}));

    expect(response.headers.get("set-cookie")).toContain("couple_cook_session=");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });
});

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}
