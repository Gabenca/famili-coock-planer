import { NextRequest } from "next/server";

import { getTelegramUserFromRequest } from "./api-auth";
import { prisma } from "./prisma";
import type { TelegramAuthUser } from "./telegram-auth";

export class HouseholdSessionError extends Error {
  constructor(message = "Household membership required") {
    super(message);
    this.name = "HouseholdSessionError";
  }
}

export async function getHouseholdSession(request: NextRequest) {
  const telegramUser = getTelegramUserFromRequest(request);
  return getHouseholdSessionForTelegramUser(telegramUser);
}

export async function getHouseholdSessionForTelegramUser(telegramUser: TelegramAuthUser) {
  const user = await prisma.user.findUnique({
    where: {
      telegramId: telegramUser.telegramId
    },
    select: {
      id: true,
      telegramId: true
    }
  });

  if (!user) {
    throw new HouseholdSessionError("User must bootstrap auth first");
  }

  const membership = await prisma.householdMember.findFirst({
    where: {
      userId: user.id
    },
    select: {
      householdId: true,
      role: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (!membership) {
    throw new HouseholdSessionError();
  }

  return {
    user,
    householdId: membership.householdId,
    role: membership.role
  };
}
