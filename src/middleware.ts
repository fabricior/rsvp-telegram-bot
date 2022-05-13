import i18next from "i18next";
import { Context, MiddlewareFn } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import { getGroup } from "./group";

const groupMiddleware: MiddlewareFn<Context<Update>> = async (ctx, next) => {
  if (ctx.updateType === "message" && ctx.chat !== undefined) {
    const group = await getGroup(ctx.chat.id);
    ctx.state.group = group;
    if (group !== null) {
      await ensureLanguage(group.language);
    }
  }
  return next();
};

async function ensureLanguage(language: string) {
  if (language !== i18next.language) {
    await i18next.changeLanguage(language);
  }
}

export { groupMiddleware };
