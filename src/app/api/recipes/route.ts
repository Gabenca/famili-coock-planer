import { NextRequest, NextResponse } from "next/server";

import { getHouseholdSession, HouseholdSessionError } from "@/lib/household-session";
import { isApiInputValidationError, parseJsonBody, recipeCreateSchema } from "@/lib/api-schemas";
import { createRecipe, listRecipes, RecipeValidationError } from "@/lib/recipes";
import { TelegramAuthError } from "@/lib/telegram-auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getHouseholdSession(request);
    const recipes = await listRecipes(session.householdId);

    return NextResponse.json({ recipes });
  } catch (error) {
    return handleRecipesError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getHouseholdSession(request);
    const input = await parseJsonBody(request, recipeCreateSchema);
    const recipe = await createRecipe(session.householdId, input);

    return NextResponse.json({ recipe }, { status: 201 });
  } catch (error) {
    return handleRecipesError(error);
  }
}

function handleRecipesError(error: unknown) {
  if (error instanceof TelegramAuthError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (error instanceof HouseholdSessionError) {
    return NextResponse.json({ error: "Household membership required" }, { status: 403 });
  }

  if (error instanceof RecipeValidationError || isApiInputValidationError(error)) {
    return NextResponse.json({ error: "Invalid recipe input" }, { status: 400 });
  }

  return NextResponse.json({ error: "Unexpected recipes failure" }, { status: 500 });
}
