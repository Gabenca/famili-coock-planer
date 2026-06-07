import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bootstrapTelegramUser, buildInviteUrl, createHouseholdInvite, HouseholdAccessError } from "./households";
import type { TelegramAuthUser } from "./telegram-auth";

type FakeUser = {
  id: string;
  telegramId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  languageCode: string | null;
};

type FakeHousehold = {
  id: string;
  name: string;
};

type FakeMembership = {
  id: string;
  householdId: string;
  userId: string;
  role: "owner" | "member";
  createdAt: Date;
};

type FakeInvite = {
  id: string;
  householdId: string;
  token: string;
  status: "active" | "accepted" | "revoked" | "expired";
  expiresAt: Date;
  acceptedByUserId: string | null;
  acceptedAt: Date | null;
};

const telegramUser = (telegramId: string): TelegramAuthUser => ({
  telegramId,
  firstName: `User ${telegramId}`,
  lastName: null,
  username: `user_${telegramId}`,
  languageCode: "ru"
});

describe("household invite flow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-07T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("creates a household for the first authenticated user without an invite", async () => {
    const client = createFakeClient();

    const result = await bootstrapTelegramUser(telegramUser("1"), undefined, client);

    expect(result.household).toEqual({
      id: "household-1",
      name: "Наша кухня",
      role: "owner"
    });
    expect(result.inviteStatus).toBe("none");
    expect(client.state.memberships).toMatchObject([{ userId: "user-1", householdId: "household-1", role: "owner" }]);
  });

  it("creates an invite for an existing household member", async () => {
    const client = createFakeClient();
    await bootstrapTelegramUser(telegramUser("1"), undefined, client);

    const invite = await createHouseholdInvite(telegramUser("1"), client);

    expect(invite.token).toHaveLength(24);
    expect(invite.expiresAt.toISOString()).toBe("2026-06-14T12:00:00.000Z");
    expect(client.state.invites).toMatchObject([{ householdId: "household-1", status: "active" }]);
  });

  it("accepts an active invite for a user without a household", async () => {
    const client = createFakeClient();
    await bootstrapTelegramUser(telegramUser("1"), undefined, client);
    const invite = await createHouseholdInvite(telegramUser("1"), client);

    const result = await bootstrapTelegramUser(telegramUser("2"), invite.token, client);

    expect(result.household).toEqual({
      id: "household-1",
      name: "Наша кухня",
      role: "member"
    });
    expect(result.inviteStatus).toBe("accepted");
    expect(client.state.memberships).toHaveLength(2);
    expect(client.state.invites[0]).toMatchObject({
      status: "accepted",
      acceptedByUserId: "user-2"
    });
  });

  it("does not accept an invite for a user who already has a household", async () => {
    const client = createFakeClient();
    await bootstrapTelegramUser(telegramUser("1"), undefined, client);
    const invite = await createHouseholdInvite(telegramUser("1"), client);
    await bootstrapTelegramUser(telegramUser("2"), undefined, client);

    const result = await bootstrapTelegramUser(telegramUser("2"), invite.token, client);

    expect(result.household).toEqual({
      id: "household-2",
      name: "Наша кухня",
      role: "owner"
    });
    expect(result.inviteStatus).toBe("ignored_existing_household");
    expect(client.state.invites[0].status).toBe("active");
  });

  it("marks expired invites and creates a new owner household for the invited user", async () => {
    const client = createFakeClient();
    await bootstrapTelegramUser(telegramUser("1"), undefined, client);
    const invite = await createHouseholdInvite(telegramUser("1"), client);
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));

    const result = await bootstrapTelegramUser(telegramUser("2"), invite.token, client);

    expect(result.household).toEqual({
      id: "household-2",
      name: "Наша кухня",
      role: "owner"
    });
    expect(result.inviteStatus).toBe("expired");
    expect(client.state.invites[0].status).toBe("expired");
  });

  it("requires a household membership before creating an invite", async () => {
    const client = createFakeClient();

    await expect(createHouseholdInvite(telegramUser("1"), client)).rejects.toBeInstanceOf(HouseholdAccessError);
  });

  it("builds a Telegram deep link when bot and app names are configured", () => {
    vi.stubEnv("TELEGRAM_BOT_USERNAME", "@couple_cook_bot");
    vi.stubEnv("TELEGRAM_APP_SHORT_NAME", "cook");

    expect(buildInviteUrl("abc 123")).toBe("https://t.me/couple_cook_bot/cook?startapp=abc%20123");
  });

  it("falls back to NEXT_PUBLIC_APP_URL when Telegram deep link settings are missing", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.vercel.app");

    expect(buildInviteUrl("token-1")).toBe("https://example.vercel.app/?invite=token-1");
  });
});

function createFakeClient() {
  const state = {
    users: [] as FakeUser[],
    households: [] as FakeHousehold[],
    memberships: [] as FakeMembership[],
    invites: [] as FakeInvite[]
  };

  const client = {
    state,
    user: {
      upsert: vi.fn(async ({ where, update, create }: { where: { telegramId: string }; update: Partial<FakeUser>; create: Omit<FakeUser, "id"> }) => {
        const existing = state.users.find((user) => user.telegramId === where.telegramId);

        if (existing) {
          Object.assign(existing, update);
          return existing;
        }

        const user = {
          id: `user-${state.users.length + 1}`,
          ...create
        };
        state.users.push(user);
        return user;
      })
    },
    household: {
      create: vi.fn(async ({ data }: { data: { name: string; members: { create: { userId: string; role: "owner" } } } }) => {
        const household = {
          id: `household-${state.households.length + 1}`,
          name: data.name
        };
        state.households.push(household);
        state.memberships.push({
          id: `membership-${state.memberships.length + 1}`,
          householdId: household.id,
          userId: data.members.create.userId,
          role: data.members.create.role,
          createdAt: new Date()
        });
        return household;
      })
    },
    householdMember: {
      findFirst: vi.fn(async ({ where }: { where: { userId: string } }) => {
        const membership = state.memberships.find((item) => item.userId === where.userId);
        const household = state.households.find((item) => item.id === membership?.householdId);
        return membership && household ? { ...membership, household } : null;
      }),
      create: vi.fn(async ({ data }: { data: { householdId: string; userId: string; role: "member" } }) => {
        const membership = {
          id: `membership-${state.memberships.length + 1}`,
          householdId: data.householdId,
          userId: data.userId,
          role: data.role,
          createdAt: new Date()
        };
        state.memberships.push(membership);
        return membership;
      })
    },
    invite: {
      create: vi.fn(async ({ data }: { data: { householdId: string; token: string; status: "active"; expiresAt: Date } }) => {
        const invite = {
          id: `invite-${state.invites.length + 1}`,
          householdId: data.householdId,
          token: data.token,
          status: data.status,
          expiresAt: data.expiresAt,
          acceptedByUserId: null,
          acceptedAt: null
        };
        state.invites.push(invite);
        return invite;
      }),
      findUnique: vi.fn(async ({ where }: { where: { token: string } }) => {
        const invite = state.invites.find((item) => item.token === where.token);
        const household = state.households.find((item) => item.id === invite?.householdId);
        return invite && household ? { ...invite, household } : null;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<FakeInvite> }) => {
        const invite = state.invites.find((item) => item.id === where.id);

        if (!invite) {
          throw new Error(`Invite ${where.id} not found`);
        }

        Object.assign(invite, data);
        return invite;
      })
    },
    $transaction: vi.fn(async (callback: (transaction: typeof client) => Promise<unknown>) => callback(client))
  };

  return client as never;
}
