import { NextRequest, NextResponse } from "next/server";

import { getHouseholdSession, HouseholdSessionError } from "@/lib/household-session";
import { isApiInputValidationError, mealPlanCreateSchema, parseJsonBody, parseWeekStart } from "@/lib/api-schemas";
import { createMealPlanItem, listMealPlan, MealPlanValidationError } from "@/lib/meal-plans";
import { TelegramAuthError } from "@/lib/telegram-auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getHouseholdSession(request);
    const weekStart = parseWeekStart(request.nextUrl.searchParams.get("weekStart"));

    const plan = await listMealPlan(session.householdId, weekStart);

    return NextResponse.json({ plan });
  } catch (error) {
    return handleMealPlanError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getHouseholdSession(request);
    const input = await parseJsonBody(request, mealPlanCreateSchema);
    const item = await createMealPlanItem(session.householdId, input);

    return NextResponse.json({ item }, { status: 201 });
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
