import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  getHouseholdSessionForTelegramUser: vi.fn(),
  loadMiniAppData: vi.fn(),
  readSessionCookieValue: vi.fn()
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies
}));

vi.mock("@/lib/session-cookie", () => ({
  readSessionCookieValue: mocks.readSessionCookieValue,
  sessionCookieName: "couple_cook_session"
}));

vi.mock("@/lib/household-session", () => ({
  getHouseholdSessionForTelegramUser: mocks.getHouseholdSessionForTelegramUser
}));

vi.mock("@/lib/mini-app-data", () => ({
  loadMiniAppData: mocks.loadMiniAppData
}));

vi.mock("@/frontend/pages/mini-app", () => ({
  MiniApp: ({ initialData }: { initialData?: { household: { name: string } } }) => <div>{initialData?.household.name ?? "demo"}</div>
}));

import { MiniApp } from "./mini-app";

describe("MiniApp server shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads initial household data from the signed session cookie", async () => {
    mocks.cookies.mockReturnValue({
      get: (name: string) => (name === "couple_cook_session" ? { name, value: "signed-cookie" } : undefined)
    });
    mocks.readSessionCookieValue.mockReturnValue({ telegramId: "42", firstName: "Максим" });
    mocks.getHouseholdSessionForTelegramUser.mockResolvedValue({ householdId: "household-1", role: "owner", user: { id: "user-1", telegramId: "42" } });
    mocks.loadMiniAppData.mockResolvedValue({
      household: { id: "household-1", name: "Наша кухня", role: "owner", members: [] },
      planItems: [],
      recipes: [],
      shoppingItems: []
    });

    render(await MiniApp());

    expect(screen.getByText("Наша кухня")).toBeInTheDocument();
    expect(mocks.readSessionCookieValue).toHaveBeenCalledWith("signed-cookie");
    expect(mocks.loadMiniAppData).toHaveBeenCalledWith({ householdId: "household-1", role: "owner", user: { id: "user-1", telegramId: "42" } }, "2026-06-01");
  });

  it("falls back to demo mode when the signed session cookie is missing", async () => {
    mocks.cookies.mockReturnValue({
      get: () => undefined
    });

    render(await MiniApp());

    expect(screen.getByText("demo")).toBeInTheDocument();
    expect(mocks.loadMiniAppData).not.toHaveBeenCalled();
  });
});
