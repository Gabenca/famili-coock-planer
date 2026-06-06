import { NextRequest, NextResponse } from "next/server";

import { authenticateTelegramInitData, TelegramAuthError } from "./telegram-auth";

export function getTelegramUserFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const rawInitData = authorization?.startsWith("tma ") ? authorization.slice(4) : undefined;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!rawInitData || !botToken) {
    throw new TelegramAuthError();
  }

  return authenticateTelegramInitData({ rawInitData, botToken });
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
