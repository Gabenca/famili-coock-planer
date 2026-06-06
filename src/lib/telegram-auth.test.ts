import { describe, expect, it, vi } from "vitest";

vi.mock("@tma.js/init-data-node", () => ({
  validate: vi.fn((value: string, token: string) => {
    if (value !== "valid-init-data" || token !== "bot-token") {
      throw new Error("invalid init data");
    }
  }),
  parse: vi.fn(() => ({
    user: {
      id: 42,
      firstName: "Mila",
      lastName: "Ivanova",
      username: "mila",
      languageCode: "ru"
    }
  }))
}));

import { authenticateTelegramInitData } from "./telegram-auth";

describe("authenticateTelegramInitData", () => {
  it("returns normalized Telegram user for valid init data", () => {
    expect(
      authenticateTelegramInitData({
        rawInitData: "valid-init-data",
        botToken: "bot-token"
      })
    ).toEqual({
      telegramId: "42",
      firstName: "Mila",
      lastName: "Ivanova",
      username: "mila",
      languageCode: "ru"
    });
  });

  it("throws a public auth error for invalid init data", () => {
    expect(() =>
      authenticateTelegramInitData({
        rawInitData: "bad-init-data",
        botToken: "bot-token"
      })
    ).toThrow("Invalid Telegram authentication");
  });
});
