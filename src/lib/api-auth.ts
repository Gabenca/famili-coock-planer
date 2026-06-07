import { NextRequest, NextResponse } from "next/server";

import { authenticateTelegramInitData, TelegramAuthError } from "./telegram-auth";
import { readSessionCookieValue, sessionCookieName } from "./session-cookie";

export function getTelegramUserFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const rawInitData = authorization?.startsWith("tma ") ? authorization.slice(4) : undefined;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!rawInitData) {
    return readSessionCookieValue(request.cookies.get(sessionCookieName)?.value);
  }

  if (!botToken) {
    throw new TelegramAuthError();
  }

  return authenticateTelegramInitData({ rawInitData, botToken });
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
