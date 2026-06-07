import { describe, expect, it, vi } from "vitest";

import { createMealPlanItem, deleteMealPlanItem, listMealPlan, MealPlanValidationError, updateMealPlanItem } from "./meal-plans";

type FakeRecipe = {
  id: string;
  householdId: string;
};

type FakeMealPlanItem = {
  id: string;
  householdId: string;
  recipeId: string;
  date: Date;
  mealSlot: string;
  servingsMultiplier: number;
  createdAt: Date;
};

describe("meal plan service", () => {
  it("lists only items for the requested week and household", async () => {
    const client = createFakeMealPlanClient();
    client.state.recipes.push({ id: "recipe-1", householdId: "household-1" }, { id: "recipe-2", householdId: "household-2" });
    await createMealPlanItem("household-1", { date: "2026-06-08", slot: "breakfast", recipeId: "recipe-1", servingsMultiplier: 1 }, client);
    await createMealPlanItem("household-1", { date: "2026-06-15", slot: "dinner", recipeId: "recipe-1", servingsMultiplier: 1 }, client);
    await createMealPlanItem("household-2", { date: "2026-06-08", slot: "dinner", recipeId: "recipe-2", servingsMultiplier: 1 }, client);

    const plan = await listMealPlan("household-1", "2026-06-08", client);

    expect(plan).toEqual([
      {
        id: "plan-1",
        date: "2026-06-08",
        slot: "breakfast",
        recipeId: "recipe-1",
        servingsMultiplier: 1
      }
    ]);
  });

  it("rejects recipes from another household", async () => {
    const client = createFakeMealPlanClient();
    client.state.recipes.push({ id: "recipe-1", householdId: "household-2" });

    await expect(createMealPlanItem("household-1", { date: "2026-06-08", slot: "breakfast", recipeId: "recipe-1", servingsMultiplier: 1 }, client)).rejects.toBeInstanceOf(MealPlanValidationError);
  });

  it("updates servings only for the requested household", async () => {
    const client = createFakeMealPlanClient();
    client.state.recipes.push({ id: "recipe-1", householdId: "household-1" });
    await createMealPlanItem("household-1", { date: "2026-06-08", slot: "breakfast", recipeId: "recipe-1", servingsMultiplier: 1 }, client);

    await expect(updateMealPlanItem("household-2", "plan-1", 2, client)).resolves.toBeNull();
    await expect(updateMealPlanItem("household-1", "plan-1", 1.5, client)).resolves.toMatchObject({
      id: "plan-1",
      servingsMultiplier: 1.5
    });
  });

  it("deletes only items from the requested household", async () => {
    const client = createFakeMealPlanClient();
    client.state.recipes.push({ id: "recipe-1", householdId: "household-1" });
    await createMealPlanItem("household-1", { date: "2026-06-08", slot: "breakfast", recipeId: "recipe-1", servingsMultiplier: 1 }, client);

    await expect(deleteMealPlanItem("household-2", "plan-1", client)).resolves.toBe(false);
    await expect(deleteMealPlanItem("household-1", "plan-1", client)).resolves.toBe(true);
    await expect(listMealPlan("household-1", "2026-06-08", client)).resolves.toEqual([]);
  });
});

function createFakeMealPlanClient() {
  const state = {
    recipes: [] as FakeRecipe[],
    planItems: [] as FakeMealPlanItem[]
  };

  const client = {
    state,
    recipe: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; householdId: string } }) => state.recipes.find((recipe) => recipe.id === where.id && recipe.householdId === where.householdId) ?? null)
    },
    mealPlanItem: {
      findMany: vi.fn(async ({ where }: { where: { householdId: string; date: { gte: Date; lt: Date } } }) =>
        state.planItems
          .filter((item) => item.householdId === where.householdId && item.date >= where.date.gte && item.date < where.date.lt)
          .sort((left, right) => left.date.getTime() - right.date.getTime() || left.createdAt.getTime() - right.createdAt.getTime())
      ),
      create: vi.fn(async ({ data }: { data: Omit<FakeMealPlanItem, "id" | "createdAt"> }) => {
        const item = {
          id: `plan-${state.planItems.length + 1}`,
          ...data,
          createdAt: new Date(Date.UTC(2026, 5, 7, 12, state.planItems.length))
        };
        state.planItems.push(item);
        return item;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { id: string; householdId: string }; data: { servingsMultiplier: number } }) => {
        const item = state.planItems.find((planItem) => planItem.id === where.id && planItem.householdId === where.householdId);

        if (!item) {
          return { count: 0 };
        }

        item.servingsMultiplier = data.servingsMultiplier;
        return { count: 1 };
      }),
      findFirst: vi.fn(async ({ where }: { where: { id: string; householdId: string } }) => state.planItems.find((item) => item.id === where.id && item.householdId === where.householdId) ?? null),
      deleteMany: vi.fn(async ({ where }: { where: { id: string; householdId: string } }) => {
        const before = state.planItems.length;
        state.planItems = state.planItems.filter((item) => item.id !== where.id || item.householdId !== where.householdId);
        return { count: before - state.planItems.length };
      })
    }
  };

  return client as never;
}
