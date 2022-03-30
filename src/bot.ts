import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import { getUpcoming } from "./game";
import { enrollUserInGroup, insertGroup } from "./group";
import { Prisma } from "@prisma/client";
import { computeRSVPStatus, rsvpViaTelegram } from "./rsvp";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN || "";
const bot = new Telegraf(token);

const robotName = process.env.ROBOT_NAME || "FulbitoYa";
const environmentName = process.env.ENVIRONMENT || "test";

export default function setup() {
  bot.command("start", async (ctx, next) => {
    console.log(`Starting bot for ChatId ${ctx.chat.id}`);

    const handleUknownError = (error: Error | unknown) => {
      console.error(error);
      ctx.reply("Something went wrong starting Bot");
    };

    try {
      await insertGroup(ctx.chat.id);
      console.log(`Bot started for ChatId ${ctx.chat.id}`);
      ctx.reply(
        `Hello there! This group is now ready to use ${robotName} (${environmentName}).`
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          ctx.reply(
            `${robotName} (${environmentName}) is already started for current group.`
          );
        } else {
          handleUknownError(error);
        }
      } else {
        handleUknownError(error);
      }
    }

    return next();
  });

  bot.command("enroll", async (ctx, next) => {
    console.log(`Enrolling UserId ${ctx.from.id} in Chat ${ctx.chat.id}`);

    try {
      await enrollUserInGroup({
        telegramChatId: ctx.chat.id,
        user: { firstName: ctx.from.first_name, telegramUserId: ctx.from.id },
      });
      console.log(
        `User ${ctx.from.id} has been enrolled in chat ${ctx.chat.id}.`
      );
      ctx.reply(`User ${ctx.from.first_name} has been enrolled.`);
    } catch (error) {
      console.error(error);
      ctx.reply("Something went wrong enrolling user");
    }
    return next();
  });

  bot.command("yes", async (ctx, next) => {
    console.log(`RSVP for UserId ${ctx.from.id} in Chat ${ctx.chat.id}`);
    const rsvpOption = "YES";

    try {
      const game = await rsvpViaTelegram({
        telegramChatId: ctx.chat.id,
        telegramUserId: ctx.from.id,
        rsvpOption: rsvpOption,
      });
      if (game) {
        console.log(`User ${ctx.from.id} has RSVPed in chat ${ctx.chat.id}. Option ${rsvpOption}`);
        ctx.reply(`User ${ctx.from.first_name} said ${rsvpOption}.`);
      } else {
        console.log(`User ${ctx.from.id} cannot RSVPed in chat ${ctx.chat.id} because there are no upcoming games`);
        ctx.reply(`There are no upcoming games for this group.`);
      }
    } catch (error) {
      console.error(error);
      ctx.reply("Something went during RSVP user");
    }
    return next();
  });

  bot.hears("cuantos", async (ctx, next) => {
    console.dir(ctx.state);

    const game = await getUpcoming(ctx.chat.id);
    if (!game) {
      bot.telegram.sendMessage(ctx.chat.id, "No upcoming games found.");
      return next();
    }

    ctx.reply(`Hello ${ctx.state.role}`);

    const status = computeRSVPStatus(game);

    bot.telegram.sendMessage(
      ctx.chat.id,
      `Going: ${status.yes.length}\nMaybe: ${status.maybe.length}\nNot going: ${status.no.length} `
    );
    return next();
  });

  bot.launch();

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
