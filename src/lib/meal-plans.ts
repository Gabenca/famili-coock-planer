import { addDays, format } from "date-fns";

import { prisma } from "./prisma";

export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner";

export type MealPlanInput = {
  date: string;
  slot: MealSlot;
  recipeId: string;
  servingsMultiplier: number;
};

type MealPlanClient = typeof prisma;

const mealSlots = new Set<MealSlot>(["breakfast", "lunch", "snack", "dinner"]);

export class MealPlanValidationError extends Error {
  constructor(message = "Invalid meal plan input") {
    super(message);
    this.name = "MealPlanValidationError";
  }
}

export async function listMealPlan(householdId: string, weekStart: string, client: MealPlanClient = prisma) {
  const start = parseDateOnly(weekStart);
  const end = addDays(start, 7);
  const planItems = await client.mealPlanItem.findMany({
    where: {
      householdId,
      date: {
        gte: start,
        lt: end
      }
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }]
  });

  return planItems.map(formatMealPlanItem);
}

export async function createMealPlanItem(householdId: string, input: MealPlanInput, client: MealPlanClient = prisma) {
  const normalized = normalizeMealPlanInput(input);
  const recipe = await client.recipe.findFirst({
    where: {
      id: normalized.recipeId,
      householdId
    },
    select: {
      id: true
    }
  });

  if (!recipe) {
    throw new MealPlanValidationError("Recipe does not belong to household");
  }

  const item = await client.mealPlanItem.create({
    data: {
      householdId,
      recipeId: normalized.recipeId,
      date: normalized.date,
      mealSlot: normalized.slot,
      servingsMultiplier: normalized.servingsMultiplier
    }
  });

  return formatMealPlanItem(item);
}

export async function updateMealPlanItem(householdId: string, itemId: string, servingsMultiplier: number, client: MealPlanClient = prisma) {
  if (!Number.isFinite(servingsMultiplier) || servingsMultiplier <= 0) {
    throw new MealPlanValidationError();
  }

  const updated = await client.mealPlanItem.updateMany({
    where: {
      id: itemId,
      householdId
    },
    data: {
      servingsMultiplier
    }
  });

  if (updated.count === 0) {
    return null;
  }

  const item = await client.mealPlanItem.findFirst({
    where: {
      id: itemId,
      householdId
    }
  });

  return item ? formatMealPlanItem(item) : null;
}

export async function deleteMealPlanItem(householdId: string, itemId: string, client: MealPlanClient = prisma) {
  const deleted = await client.mealPlanItem.deleteMany({
    where: {
      id: itemId,
      householdId
    }
  });

  return deleted.count > 0;
}

function normalizeMealPlanInput(input: MealPlanInput) {
  const date = parseDateOnly(input.date);

  if (!mealSlots.has(input.slot) || !input.recipeId.trim() || !Number.isFinite(input.servingsMultiplier) || input.servingsMultiplier <= 0) {
    throw new MealPlanValidationError();
  }

  return {
    date,
    slot: input.slot,
    recipeId: input.recipeId.trim(),
    servingsMultiplier: input.servingsMultiplier
  };
}

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new MealPlanValidationError("Date must use yyyy-MM-dd format");
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new MealPlanValidationError("Invalid date");
  }

  return date;
}

function formatMealPlanItem(item: {
  id: string;
  recipeId: string;
  date: Date;
  mealSlot: string;
  servingsMultiplier: number;
}) {
  return {
    id: item.id,
    date: format(item.date, "yyyy-MM-dd"),
    slot: item.mealSlot as MealSlot,
    recipeId: item.recipeId,
    servingsMultiplier: item.servingsMultiplier
  };
}
