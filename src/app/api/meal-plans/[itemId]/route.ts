import { NextRequest, NextResponse } from "next/server";

import { getHouseholdSession, HouseholdSessionError } from "@/lib/household-session";
import { isApiInputValidationError, mealPlanUpdateSchema, parseJsonBody } from "@/lib/api-schemas";
import { deleteMealPlanItem, MealPlanValidationError, updateMealPlanItem } from "@/lib/meal-plans";
import { TelegramAuthError } from "@/lib/telegram-auth";

export async function PATCH(request: NextRequest, { params }: { params: { itemId: string } }) {
  try {
    const session = await getHouseholdSession(request);
    const input = await parseJsonBody(request, mealPlanUpdateSchema);
    const item = await updateMealPlanItem(session.householdId, params.itemId, input.servingsMultiplier);

    if (!item) {
      return NextResponse.json({ error: "Meal plan item not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    return handleMealPlanError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { itemId: string } }) {
  try {
    const session = await getHouseholdSession(request);
    const deleted = await deleteMealPlanItem(session.householdId, params.itemId);

    if (!deleted) {
      return NextResponse.json({ error: "Meal plan item not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleMealPlanError(error);
  }
}

function handleMealPlanError(error: unknown) {
  if (error instanceof TelegramAuthError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (error instanceof HouseholdSessionError) {
    return NextResponse.json({ error: "Household membership required" }, { status: 403 });
  }

  if (error instanceof MealPlanValidationError || isApiInputValidationError(error)) {
    return NextResponse.json({ error: "Invalid meal plan input" }, { status: 400 });
  }

  return NextResponse.json({ error: "Unexpected meal plan failure" }, { status: 500 });
}
