import { addDays } from "date-fns";

import { buildShoppingList } from "./shopping-list";
import { prisma } from "./prisma";

export type ManualShoppingInput = {
  weekStart: string;
  name: string;
  quantity: number;
  unit: string;
};

export type ShoppingCheckInput = {
  weekStart: string;
  itemKey: string;
  checked: boolean;
};

type ShoppingDataClient = typeof prisma;

export class ShoppingDataValidationError extends Error {
  constructor(message = "Invalid shopping list input") {
    super(message);
    this.name = "ShoppingDataValidationError";
  }
}

export async function getShoppingList(householdId: string, weekStart: string, client: ShoppingDataClient = prisma) {
  const start = parseDateOnly(weekStart);
  const end = addDays(start, 7);
  const [recipes, planItems, manualItems, checkedItems] = await Promise.all([
    client.recipe.findMany({
      where: {
        householdId
      },
      include: {
        ingredients: true
      }
    }),
    client.mealPlanItem.findMany({
      where: {
        householdId,
        date: {
          gte: start,
          lt: end
        }
      }
    }),
    client.shoppingManualItem.findMany({
      where: {
        householdId,
        weekStart: start
      },
      orderBy: {
        createdAt: "asc"
      }
    }),
    client.shoppingCheckState.findMany({
      where: {
        householdId,
        weekStart: start,
        checked: true
      }
    })
  ]);

  return buildShoppingList({
    recipes: recipes.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      ingredients: recipe.ingredients.map((ingredient) => ({
        productId: ingredient.productId ?? undefined,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit
      }))
    })),
    planItems: planItems.map((item) => ({
      recipeId: item.recipeId,
      servingsMultiplier: item.servingsMultiplier
    })),
    manualItems: manualItems.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit
    })),
    checkedKeys: checkedItems.map((item) => item.itemKey)
  });
}

export async function createManualShoppingItem(householdId: string, input: ManualShoppingInput, client: ShoppingDataClient = prisma) {
  const normalized = normalizeManualShoppingInput(input);
  const item = await client.shoppingManualItem.create({
    data: {
      householdId,
      weekStart: normalized.weekStart,
      name: normalized.name,
      quantity: normalized.quantity,
      unit: normalized.unit
    }
  });

  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit
  };
}

export async function updateShoppingCheckState(householdId: string, input: ShoppingCheckInput, client: ShoppingDataClient = prisma) {
  const normalized = normalizeShoppingCheckInput(input);
  const item = await client.shoppingCheckState.upsert({
    where: {
      householdId_weekStart_itemKey: {
        householdId,
        weekStart: normalized.weekStart,
        itemKey: normalized.itemKey
      }
    },
    update: {
      checked: normalized.checked
    },
    create: {
      householdId,
      weekStart: normalized.weekStart,
      itemKey: normalized.itemKey,
      checked: normalized.checked
    }
  });

  return {
    itemKey: item.itemKey,
    checked: item.checked
  };
}

function normalizeManualShoppingInput(input: ManualShoppingInput) {
  const weekStart = parseDateOnly(input.weekStart);
  const name = input.name.trim();
  const unit = input.unit.trim();

  if (!name || !unit || !Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new ShoppingDataValidationError();
  }

  return {
    weekStart,
    name,
    quantity: input.quantity,
    unit
  };
}

function normalizeShoppingCheckInput(input: ShoppingCheckInput) {
  const weekStart = parseDateOnly(input.weekStart);
  const itemKey = input.itemKey.trim();

  if (!itemKey || typeof input.checked !== "boolean") {
    throw new ShoppingDataValidationError();
  }

  return {
    weekStart,
    itemKey,
    checked: input.checked
  };
}

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ShoppingDataValidationError("Date must use yyyy-MM-dd format");
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new ShoppingDataValidationError("Invalid date");
  }

  return date;
}
