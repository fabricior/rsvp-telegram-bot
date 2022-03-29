import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import { computeRSVPStatus, getUpcoming } from "./game";
import { enrollUserInGroup, insertGroup } from "./group";
import { Prisma } from "@prisma/client";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN || "";
const bot = new Telegraf(token);

const robotName = process.env.ROBOT_NAME || "FulbitoYa";
const environmentName = process.env.ENVIRONMENT || "test";

export default function setup() {
  bot.command("start", async (ctx) => {
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
  });

  bot.command("enroll", async (ctx) => {
    console.log(`Enrolling UserId ${ctx.from.id} in Chat ${ctx.chat.id}`);

    try {
      await enrollUserInGroup({
        telegramChatId: ctx.chat.id,
        user: { firstName: ctx.from.first_name, telegramUserId: ctx.from.id },
      });
      console.log(`User ${ctx.from.id} has been enrolled in chat ${ctx.chat.id}.`);
      ctx.reply(`User ${ctx.from.first_name} has been enrolled.`);
    } catch (error) {
      console.error(error);
      ctx.reply("Something went wrong enrolling user");
    }
  });

  bot.hears("cuantos", async (ctx, next) => {
    console.dir(ctx.state);

    const game = await getUpcoming();
    if (!game) {
      bot.telegram.sendMessage(ctx.chat.id, "No upcoming games found.");
      return;
    }

    ctx.reply(`Hello ${ctx.state.role}`);

    const status = computeRSVPStatus(game);

    bot.telegram.sendMessage(
      ctx.chat.id,
      `Going: ${status.goingCount}\nMaybe: ${status.maybeCount}\nNot going: ${status.notGoingCount} `
    );
  });

  bot.launch();

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
