import { createHmac, timingSafeEqual } from "crypto";

import { z } from "zod";

import { TelegramAuthError, type TelegramAuthUser } from "./telegram-auth";

export const sessionCookieName = "couple_cook_session";
export const sessionCookieMaxAgeSeconds = 30 * 24 * 60 * 60;

const sessionUserSchema = z.object({
  telegramId: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  username: z.string().optional(),
  languageCode: z.string().optional()
});

export function createSessionCookieValue(user: TelegramAuthUser) {
  const payload = Buffer.from(JSON.stringify(sessionUserSchema.parse(user))).toString("base64url");
  const signature = signPayload(payload);

  return `${payload}.${signature}`;
}

export function readSessionCookieValue(value: string | undefined) {
  if (!value) {
    throw new TelegramAuthError();
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature || !verifySignature(payload, signature)) {
    throw new TelegramAuthError();
  }

  try {
    return sessionUserSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
  } catch {
    throw new TelegramAuthError();
  }
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function verifySignature(payload: string, signature: string) {
  const expected = signPayload(payload);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function getSessionSecret() {
  const secret = process.env.TELEGRAM_BOT_TOKEN;

  if (!secret) {
    throw new TelegramAuthError();
  }

  return secret;
}
