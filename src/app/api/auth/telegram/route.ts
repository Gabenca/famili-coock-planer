import { NextRequest, NextResponse } from "next/server";

import { authBodySchema } from "@/lib/api-schemas";
import { getTelegramUserFromRequest, unauthorizedResponse } from "@/lib/api-auth";
import { bootstrapTelegramUser } from "@/lib/households";
import { createSessionCookieValue, sessionCookieMaxAgeSeconds, sessionCookieName } from "@/lib/session-cookie";
import { TelegramAuthError } from "@/lib/telegram-auth";

export async function POST(request: NextRequest) {
  try {
    const user = getTelegramUserFromRequest(request);
    const body = await readAuthBody(request);
    const result = await bootstrapTelegramUser(user, body.inviteToken);
    const response = NextResponse.json(result);

    response.cookies.set(
      sessionCookieName,
      createSessionCookieValue({
        telegramId: result.user.telegramId,
        firstName: result.user.firstName ?? undefined,
        lastName: result.user.lastName ?? undefined,
        username: result.user.username ?? undefined,
        languageCode: result.user.languageCode ?? undefined
      }),
      {
        httpOnly: true,
        maxAge: sessionCookieMaxAgeSeconds,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
      }
    );

    return response;
  } catch (error) {
    if (error instanceof TelegramAuthError) {
      return unauthorizedResponse();
    }

    return NextResponse.json({ error: "Unexpected auth failure" }, { status: 500 });
  }
}

async function readAuthBody(request: NextRequest) {
  try {
    const body = authBodySchema.parse(await request.json());
    const inviteToken = body.inviteToken ?? "";

    return {
      inviteToken: inviteToken || undefined
    };
  } catch {
    return {
      inviteToken: undefined
    };
  }
}
