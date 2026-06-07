import { NextRequest, NextResponse } from "next/server";

import { getHouseholdSession, HouseholdSessionError } from "@/lib/household-session";
import { deleteRecipe } from "@/lib/recipes";
import { TelegramAuthError } from "@/lib/telegram-auth";

export async function DELETE(request: NextRequest, { params }: { params: { recipeId: string } }) {
  try {
    const session = await getHouseholdSession(request);
    const deleted = await deleteRecipe(session.householdId, params.recipeId);

    if (!deleted) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof TelegramAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof HouseholdSessionError) {
      return NextResponse.json({ error: "Household membership required" }, { status: 403 });
    }

    return NextResponse.json({ error: "Unexpected recipe failure" }, { status: 500 });
  }
}
