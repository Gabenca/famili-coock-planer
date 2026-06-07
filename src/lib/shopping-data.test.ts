import { describe, expect, it, vi } from "vitest";

import { createManualShoppingItem, getShoppingList, updateShoppingCheckState } from "./shopping-data";

type FakeRecipe = {
  id: string;
  householdId: string;
  title: string;
  ingredients: Array<{
    productId: string | null;
    name: string;
    quantity: number;
    unit: string;
  }>;
};

type FakePlanItem = {
  householdId: string;
  recipeId: string;
  date: Date;
  servingsMultiplier: number;
};

type FakeManualItem = {
  id: string;
  householdId: string;
  weekStart: Date;
  name: string;
  quantity: number;
  unit: string;
  createdAt: Date;
};

type FakeCheckState = {
  householdId: string;
  weekStart: Date;
  itemKey: string;
  checked: boolean;
};

describe("shopping data service", () => {
  it("builds generated list from household recipes and plan items", async () => {
    const client = createFakeShoppingClient();
    client.state.recipes.push({
      id: "recipe-1",
      householdId: "household-1",
      title: "Паста",
      ingredients: [{ productId: "tomato", name: "Томаты", quantity: 0.5, unit: "кг" }]
    });
    client.state.planItems.push({
      householdId: "household-1",
      recipeId: "recipe-1",
      date: new Date("2026-06-08T00:00:00.000Z"),
      servingsMultiplier: 2
    });

    await expect(getShoppingList("household-1", "2026-06-08", client)).resolves.toEqual([
      {
        key: "generated:tomato:г",
        name: "Томаты",
        quantity: 1000,
        unit: "г",
        source: "generated",
        checked: false
      }
    ]);
  });

  it("includes manual items and checked state for the selected week", async () => {
    const client = createFakeShoppingClient();
    client.state.manualItems.push({
      id: "manual-1",
      householdId: "household-1",
      weekStart: new Date("2026-06-08T00:00:00.000Z"),
      name: "Кофе",
      quantity: 1,
      unit: "шт",
      createdAt: new Date("2026-06-08T12:00:00.000Z")
    });
    client.state.checkStates.push({
      householdId: "household-1",
      weekStart: new Date("2026-06-08T00:00:00.000Z"),
      itemKey: "manual:manual-1",
      checked: true
    });

    await expect(getShoppingList("household-1", "2026-06-08", client)).resolves.toEqual([
      {
        key: "manual:manual-1",
        name: "Кофе",
        quantity: 1,
        unit: "шт",
        source: "manual",
        checked: true
      }
    ]);
  });

  it("creates manual items", async () => {
    const client = createFakeShoppingClient();

    await expect(createManualShoppingItem("household-1", { weekStart: "2026-06-08", name: " Лимоны ", quantity: 4, unit: " шт " }, client)).resolves.toEqual({
      id: "manual-1",
      name: "Лимоны",
      quantity: 4,
      unit: "шт"
    });
  });

  it("upserts checked state", async () => {
    const client = createFakeShoppingClient();

    await expect(updateShoppingCheckState("household-1", { weekStart: "2026-06-08", itemKey: "generated:rice:г", checked: true }, client)).resolves.toEqual({
      itemKey: "generated:rice:г",
      checked: true
    });
    await expect(updateShoppingCheckState("household-1", { weekStart: "2026-06-08", itemKey: "generated:rice:г", checked: false }, client)).resolves.toEqual({
      itemKey: "generated:rice:г",
      checked: false
    });
    expect(client.state.checkStates).toHaveLength(1);
  });
});

function createFakeShoppingClient() {
  const state = {
    recipes: [] as FakeRecipe[],
    planItems: [] as FakePlanItem[],
    manualItems: [] as FakeManualItem[],
    checkStates: [] as FakeCheckState[]
  };

  const client = {
    state,
    recipe: {
      findMany: vi.fn(async ({ where }: { where: { householdId: string } }) => state.recipes.filter((recipe) => recipe.householdId === where.householdId))
    },
    mealPlanItem: {
      findMany: vi.fn(async ({ where }: { where: { householdId: string; date: { gte: Date; lt: Date } } }) =>
        state.planItems.filter((item) => item.householdId === where.householdId && item.date >= where.date.gte && item.date < where.date.lt)
      )
    },
    shoppingManualItem: {
      findMany: vi.fn(async ({ where }: { where: { householdId: string; weekStart: Date } }) =>
        state.manualItems
          .filter((item) => item.householdId === where.householdId && item.weekStart.getTime() === where.weekStart.getTime())
          .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      ),
      create: vi.fn(async ({ data }: { data: Omit<FakeManualItem, "id" | "createdAt"> }) => {
        const item = {
          id: `manual-${state.manualItems.length + 1}`,
          ...data,
          createdAt: new Date("2026-06-08T12:00:00.000Z")
        };
        state.manualItems.push(item);
        return item;
      })
    },
    shoppingCheckState: {
      findMany: vi.fn(async ({ where }: { where: { householdId: string; weekStart: Date; checked: boolean } }) =>
        state.checkStates.filter((item) => item.householdId === where.householdId && item.weekStart.getTime() === where.weekStart.getTime() && item.checked === where.checked)
      ),
      upsert: vi.fn(async ({ where, update, create }: { where: { householdId_weekStart_itemKey: { householdId: string; weekStart: Date; itemKey: string } }; update: { checked: boolean }; create: FakeCheckState }) => {
        const existing = state.checkStates.find(
          (item) =>
            item.householdId === where.householdId_weekStart_itemKey.householdId &&
            item.weekStart.getTime() === where.householdId_weekStart_itemKey.weekStart.getTime() &&
            item.itemKey === where.householdId_weekStart_itemKey.itemKey
        );

        if (existing) {
          existing.checked = update.checked;
          return existing;
        }

        state.checkStates.push(create);
        return create;
      })
    }
  };

  return client as never;
}
