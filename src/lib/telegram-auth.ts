import { parse, validate } from "@tma.js/init-data-node";

export type TelegramAuthUser = {
  telegramId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
};

export type TelegramAuthInput = {
  rawInitData: string;
  botToken: string;
};

export class TelegramAuthError extends Error {
  constructor() {
    super("Invalid Telegram authentication");
    this.name = "TelegramAuthError";
  }
}

export function authenticateTelegramInitData(input: TelegramAuthInput): TelegramAuthUser {
  try {
    validate(input.rawInitData, input.botToken);
    const initData = parse(input.rawInitData);

    if (!initData.user) {
      throw new TelegramAuthError();
    }

    return {
      telegramId: String(initData.user.id),
      firstName: initData.user.firstName,
      lastName: initData.user.lastName,
      username: initData.user.username,
      languageCode: initData.user.languageCode
    };
  } catch (error) {
    if (error instanceof TelegramAuthError) {
      throw error;
    }

    throw new TelegramAuthError();
  }
}
