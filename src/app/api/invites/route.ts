import { NextRequest, NextResponse } from "next/server";

import { getTelegramUserFromRequest, unauthorizedResponse } from "@/lib/api-auth";
import { createHouseholdInvite, HouseholdAccessError } from "@/lib/households";
import { TelegramAuthError } from "@/lib/telegram-auth";

export async function POST(request: NextRequest) {
  try {
    const user = getTelegramUserFromRequest(request);
    const invite = await createHouseholdInvite(user);

    return NextResponse.json({ invite });
  } catch (error) {
    if (error instanceof TelegramAuthError) {
      return unauthorizedResponse();
    }

    if (error instanceof HouseholdAccessError) {
      return NextResponse.json({ error: "Household membership required" }, { status: 403 });
    }

    return NextResponse.json({ error: "Unexpected invite failure" }, { status: 500 });
  }
}
