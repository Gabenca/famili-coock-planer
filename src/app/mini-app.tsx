import React from "react";
import { cookies } from "next/headers";

import { demoWeekDates } from "@/data/demo";
import { getHouseholdSessionForTelegramUser } from "@/lib/household-session";
import { loadMiniAppData } from "@/lib/mini-app-data";
import { readSessionCookieValue, sessionCookieName } from "@/lib/session-cookie";
import { MiniApp as MiniAppClient } from "@/frontend/pages/mini-app";

export async function MiniApp() {
  const initialData = await loadInitialMiniAppData();

  return <MiniAppClient initialData={initialData} />;
}

async function loadInitialMiniAppData() {
  try {
    const sessionCookie = cookies().get(sessionCookieName)?.value;

    if (!sessionCookie) {
      return undefined;
    }

    const telegramUser = readSessionCookieValue(sessionCookie);
    const session = await getHouseholdSessionForTelegramUser(telegramUser);

    return loadMiniAppData(session, demoWeekDates[0]);
  } catch {
    return undefined;
  }
}
