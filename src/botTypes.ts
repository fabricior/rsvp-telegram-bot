import { Context, NarrowedContext, Telegram } from "telegraf";
import { UserFromGetMe } from "telegraf/typings/core/types/typegram";
import { Update } from "typegram/update";
import { MountMap } from "telegraf/typings/telegram-types";
import { Logger } from "winston";

export type Ctx = NarrowedContext<CustomContext, MountMap["text"]>;

export interface BotContext extends Context {
  logger: Logger;
}

export class CustomContext extends Context<Update> {
  constructor(
    update: Update,
    tg: Telegram,
    botInfo: UserFromGetMe,
    logger: Logger
  ) {
    super(update, tg, botInfo);

    this._logger = logger;
  }

  private _logger: Logger;
  public get logger(): Logger {
    return this._logger;
  }
  public set logger(logger: Logger) {
    this._logger = logger;
  }
}
