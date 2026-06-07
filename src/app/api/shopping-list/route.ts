import { NextRequest, NextResponse } from "next/server";

import { getHouseholdSession, HouseholdSessionError } from "@/lib/household-session";
import { isApiInputValidationError, parseJsonBody, parseWeekStart, shoppingCheckStateSchema, shoppingManualItemSchema } from "@/lib/api-schemas";
import { createManualShoppingItem, getShoppingList, ShoppingDataValidationError, updateShoppingCheckState } from "@/lib/shopping-data";
import { TelegramAuthError } from "@/lib/telegram-auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getHouseholdSession(request);
    const weekStart = parseWeekStart(request.nextUrl.searchParams.get("weekStart"));

    const items = await getShoppingList(session.householdId, weekStart);

    return NextResponse.json({ items });
  } catch (error) {
    return handleShoppingListError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getHouseholdSession(request);
    const input = await parseJsonBody(request, shoppingManualItemSchema);
    const item = await createManualShoppingItem(session.householdId, input);

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return handleShoppingListError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getHouseholdSession(request);
    const input = await parseJsonBody(request, shoppingCheckStateSchema);
    const checkState = await updateShoppingCheckState(session.householdId, input);

    return NextResponse.json({ checkState });
  } catch (error) {
    return handleShoppingListError(error);
  }
}

function handleShoppingListError(error: unknown) {
  if (error instanceof TelegramAuthError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (error instanceof HouseholdSessionError) {
    return NextResponse.json({ error: "Household membership required" }, { status: 403 });
  }

  if (error instanceof ShoppingDataValidationError || isApiInputValidationError(error)) {
    return NextResponse.json({ error: "Invalid shopping list input" }, { status: 400 });
  }

  return NextResponse.json({ error: "Unexpected shopping list failure" }, { status: 500 });
}
