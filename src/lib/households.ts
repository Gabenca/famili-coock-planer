import { randomBytes } from "crypto";

import type { HouseholdRole } from "@prisma/client";

import { prisma } from "./prisma";
import type { TelegramAuthUser } from "./telegram-auth";

export type InviteStatus = "accepted" | "ignored_existing_household" | "invalid" | "expired" | "none";

export type AuthHousehold = {
  id: string;
  name: string;
  role: HouseholdRole;
};

export type AuthBootstrapResult = {
  user: {
    id: string;
    telegramId: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    languageCode: string | null;
  };
  household: AuthHousehold;
  inviteStatus: InviteStatus;
};

type HouseholdClient = typeof prisma;

const householdName = "Наша кухня";
const inviteTtlMs = 7 * 24 * 60 * 60 * 1000;

export class HouseholdAccessError extends Error {
  constructor(message = "Household membership required") {
    super(message);
    this.name = "HouseholdAccessError";
  }
}

export async function bootstrapTelegramUser(telegramUser: TelegramAuthUser, inviteToken?: string, client: HouseholdClient = prisma): Promise<AuthBootstrapResult> {
  const user = await upsertTelegramUser(telegramUser, client);
  const existingMembership = await findFirstMembership(user.id, client);

  if (existingMembership) {
    return {
      user,
      household: {
        id: existingMembership.household.id,
        name: existingMembership.household.name,
        role: existingMembership.role
      },
      inviteStatus: inviteToken ? "ignored_existing_household" : "none"
    };
  }

  const accepted = inviteToken ? await acceptInvite(user.id, inviteToken, client) : null;

  if (accepted?.household) {
    return {
      user,
      household: accepted.household,
      inviteStatus: accepted.status
    };
  }

  const household = await client.household.create({
    data: {
      name: householdName,
      members: {
        create: {
          userId: user.id,
          role: "owner"
        }
      }
    }
  });

  return {
    user,
    household: {
      id: household.id,
      name: household.name,
      role: "owner"
    },
    inviteStatus: accepted?.status ?? (inviteToken ? "invalid" : "none")
  };
}

export async function createHouseholdInvite(telegramUser: TelegramAuthUser, client: HouseholdClient = prisma) {
  const user = await upsertTelegramUser(telegramUser, client);
  const membership = await findFirstMembership(user.id, client);

  if (!membership) {
    throw new HouseholdAccessError();
  }

  const invite = await client.invite.create({
    data: {
      householdId: membership.householdId,
      token: createInviteToken(),
      status: "active",
      expiresAt: new Date(Date.now() + inviteTtlMs)
    }
  });

  return {
    token: invite.token,
    expiresAt: invite.expiresAt,
    url: buildInviteUrl(invite.token)
  };
}

export function buildInviteUrl(token: string) {
  const encodedToken = encodeURIComponent(token);
  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const appShortName = process.env.TELEGRAM_APP_SHORT_NAME ?? process.env.NEXT_PUBLIC_TELEGRAM_APP_SHORT_NAME;

  if (botUsername && appShortName) {
    return `https://t.me/${botUsername.replace(/^@/, "")}/${appShortName}?startapp=${encodedToken}`;
  }

  const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  appUrl.searchParams.set("invite", token);

  return appUrl.toString();
}

async function upsertTelegramUser(telegramUser: TelegramAuthUser, client: HouseholdClient) {
  return client.user.upsert({
    where: {
      telegramId: telegramUser.telegramId
    },
    update: {
      firstName: telegramUser.firstName,
      lastName: telegramUser.lastName,
      username: telegramUser.username,
      languageCode: telegramUser.languageCode
    },
    create: {
      telegramId: telegramUser.telegramId,
      firstName: telegramUser.firstName,
      lastName: telegramUser.lastName,
      username: telegramUser.username,
      languageCode: telegramUser.languageCode
    },
    select: {
      id: true,
      telegramId: true,
      firstName: true,
      lastName: true,
      username: true,
      languageCode: true
    }
  });
}

async function findFirstMembership(userId: string, client: HouseholdClient) {
  return client.householdMember.findFirst({
    where: {
      userId
    },
    include: {
      household: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });
}

async function acceptInvite(userId: string, token: string, client: HouseholdClient): Promise<{ status: "accepted"; household: AuthHousehold } | { status: "expired"; household: null } | null> {
  return client.$transaction(async (transaction) => {
    const existingMembership = await transaction.householdMember.findFirst({
      where: {
        userId
      },
      include: {
        household: true
      }
    });

    if (existingMembership) {
      return {
        status: "accepted",
        household: {
          id: existingMembership.household.id,
          name: existingMembership.household.name,
          role: existingMembership.role
        }
      };
    }

    const invite = await transaction.invite.findUnique({
      where: {
        token
      },
      include: {
        household: true
      }
    });

    if (!invite || invite.status !== "active") {
      return null;
    }

    if (invite.expiresAt.getTime() <= Date.now()) {
      await transaction.invite.update({
        where: {
          id: invite.id
        },
        data: {
          status: "expired"
        }
      });

      return {
        status: "expired",
        household: null
      };
    }

    await transaction.householdMember.create({
      data: {
        householdId: invite.householdId,
        userId,
        role: "member"
      }
    });

    await transaction.invite.update({
      where: {
        id: invite.id
      },
      data: {
        status: "accepted",
        acceptedByUserId: userId,
        acceptedAt: new Date()
      }
    });

    return {
      status: "accepted",
      household: {
        id: invite.household.id,
        name: invite.household.name,
        role: "member"
      }
    };
  });
}

function createInviteToken() {
  return randomBytes(18).toString("base64url");
}
