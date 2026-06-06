import { NextRequest, NextResponse } from "next/server";

import { getTelegramUserFromRequest, unauthorizedResponse } from "@/lib/api-auth";
import { TelegramAuthError } from "@/lib/telegram-auth";

export async function POST(request: NextRequest) {
  try {
    const user = getTelegramUserFromRequest(request);

    return NextResponse.json({
      user,
      household: {
        id: "demo-household",
        name: "Our kitchen"
      }
    });
  } catch (error) {
    if (error instanceof TelegramAuthError) {
      return unauthorizedResponse();
    }

    return NextResponse.json({ error: "Unexpected auth failure" }, { status: 500 });
  }
}
