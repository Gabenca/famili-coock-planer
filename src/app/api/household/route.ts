import { NextRequest, NextResponse } from "next/server";

import { getHouseholdSession, HouseholdSessionError } from "@/lib/household-session";
import { prisma } from "@/lib/prisma";
import { TelegramAuthError } from "@/lib/telegram-auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getHouseholdSession(request);
    const household = await prisma.household.findUnique({
      where: {
        id: session.householdId
      },
      include: {
        members: {
          include: {
            user: true
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!household) {
      return NextResponse.json({ error: "Household not found" }, { status: 404 });
    }

    return NextResponse.json({
      household: {
        id: household.id,
        name: household.name,
        role: session.role,
        members: household.members.map((member) => ({
          id: member.user.id,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          username: member.user.username,
          role: member.role
        }))
      }
    });
  } catch (error) {
    if (error instanceof TelegramAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof HouseholdSessionError) {
      return NextResponse.json({ error: "Household membership required" }, { status: 403 });
    }

    return NextResponse.json({ error: "Unexpected household failure" }, { status: 500 });
  }
}
