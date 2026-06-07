import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getTelegramUserFromRequest } from "./api-auth";
import { createSessionCookieValue, sessionCookieName } from "./session-cookie";

vi.mock("./telegram-auth", () => ({
  authenticateTelegramInitData: vi.fn(() => ({ telegramId: "42", firstName: "Header", lastName: undefined, username: undefined, languageCode: undefined })),
  TelegramAuthError: class TelegramAuthError extends Error {
    constructor() {
      super("Invalid Telegram authentication");
      this.name = "TelegramAuthError";
    }
  }
}));

describe("session cookie", () => {
  const originalBotToken = process.env.TELEGRAM_BOT_TOKEN;

  afterEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = originalBotToken;
  });

  it("lets request auth fall back to a signed Telegram session cookie", () => {
    process.env.TELEGRAM_BOT_TOKEN = "test-secret";
    const value = createSessionCookieValue({
      telegramId: "42",
      firstName: "Максим",
      lastName: undefined,
      username: "max",
      languageCode: "ru"
    });
    const request = new NextRequest("http://localhost/api/household", {
      headers: {
        cookie: `${sessionCookieName}=${value}`
      }
    });

    expect(getTelegramUserFromRequest(request)).toEqual({
      telegramId: "42",
      firstName: "Максим",
      lastName: undefined,
      username: "max",
      languageCode: "ru"
    });
  });

  it("rejects a tampered Telegram session cookie", () => {
    process.env.TELEGRAM_BOT_TOKEN = "test-secret";
    const value = createSessionCookieValue({
      telegramId: "42",
      firstName: "Максим",
      lastName: undefined,
      username: undefined,
      languageCode: undefined
    });
    const tampered = `${value.slice(0, -1)}x`;
    const request = new NextRequest("http://localhost/api/household", {
      headers: {
        cookie: `${sessionCookieName}=${tampered}`
      }
    });

    expect(() => getTelegramUserFromRequest(request)).toThrow("Invalid Telegram authentication");
  });
});
