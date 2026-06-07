import type { HouseholdRole } from "@prisma/client";

import { HouseholdSessionError } from "./household-session";
import { listMealPlan } from "./meal-plans";
import { prisma } from "./prisma";
import { listRecipes } from "./recipes";
import { getShoppingList } from "./shopping-data";

export type MiniAppSession = {
  householdId: string;
  role: HouseholdRole;
  user: {
    id: string;
    telegramId: string;
  };
};

export async function loadMiniAppData(session: MiniAppSession, weekStart: string) {
  const [household, recipes, planItems, shoppingItems] = await Promise.all([
    prisma.household.findUnique({
      where: {
        id: session.householdId
      },
      include: {
        members: {
          include: {
            user: true
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    }),
    listRecipes(session.householdId),
    listMealPlan(session.householdId, weekStart),
    getShoppingList(session.householdId, weekStart)
  ]);

  if (!household) {
    throw new HouseholdSessionError("Household not found");
  }

  return {
    household: {
      id: household.id,
      name: household.name,
      role: session.role,
      members: household.members.map((member) => ({
        id: member.user.id,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        username: member.user.username,
        role: member.role
      }))
    },
    planItems,
    recipes,
    shoppingItems
  };
}
