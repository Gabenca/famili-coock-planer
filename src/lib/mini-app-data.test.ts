import { describe, expect, it, vi } from "vitest";

import { loadMiniAppData } from "./mini-app-data";

const mocks = vi.hoisted(() => ({
  findHousehold: vi.fn(),
  getShoppingList: vi.fn(),
  listMealPlan: vi.fn(),
  listRecipes: vi.fn()
}));

vi.mock("./recipes", () => ({
  listRecipes: mocks.listRecipes
}));

vi.mock("./meal-plans", () => ({
  listMealPlan: mocks.listMealPlan
}));

vi.mock("./shopping-data", () => ({
  getShoppingList: mocks.getShoppingList
}));

vi.mock("./prisma", () => ({
  prisma: {
    household: {
      findUnique: mocks.findHousehold
    }
  }
}));

describe("loadMiniAppData", () => {
  it("loads household metadata, members, recipes, plan, and shopping items for a session", async () => {
    mocks.findHousehold.mockResolvedValue({
      id: "household-1",
      name: "Наша кухня",
      members: [
        {
          role: "owner",
          user: {
            id: "user-1",
            firstName: "Максим",
            lastName: null,
            username: "max"
          }
        }
      ]
    });
    mocks.listRecipes.mockResolvedValue([{ id: "recipe-1", title: "Сырники", ingredients: [] }]);
    mocks.listMealPlan.mockResolvedValue([{ id: "plan-1", date: "2026-06-08", slot: "breakfast", recipeId: "recipe-1", servingsMultiplier: 1 }]);
    mocks.getShoppingList.mockResolvedValue([{ key: "manual:coffee", name: "Кофе", quantity: 1, unit: "шт", source: "manual", checked: false }]);

    const data = await loadMiniAppData(
      {
        householdId: "household-1",
        role: "owner",
        user: {
          id: "user-1",
          telegramId: "42"
        }
      },
      "2026-06-08"
    );

    expect(data).toEqual({
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
      planItems: [{ id: "plan-1", date: "2026-06-08", slot: "breakfast", recipeId: "recipe-1", servingsMultiplier: 1 }],
      recipes: [{ id: "recipe-1", title: "Сырники", ingredients: [] }],
      shoppingItems: [{ key: "manual:coffee", name: "Кофе", quantity: 1, unit: "шт", source: "manual", checked: false }]
    });
    expect(mocks.listRecipes).toHaveBeenCalledWith("household-1");
    expect(mocks.listMealPlan).toHaveBeenCalledWith("household-1", "2026-06-08");
    expect(mocks.getShoppingList).toHaveBeenCalledWith("household-1", "2026-06-08");
  });
});
