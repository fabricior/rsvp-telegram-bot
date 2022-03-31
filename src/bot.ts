import { Context, NarrowedContext, Telegraf } from "telegraf";
import dotenv from "dotenv";
import { getUpcoming, insertGame } from "./game";
import { enrollUserInGroup, insertGroup } from "./group";
import { Prisma, RsvpOption } from "@prisma/client";
import { computeRSVPStatus, rsvpViaTelegram } from "./rsvp";
import { Update } from "typegram/update";
import { MountMap } from "telegraf/typings/telegram-types";
import { parseDateISO } from "./dates";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN || "";
const bot = new Telegraf(token);

const robotName = process.env.ROBOT_NAME || "FulbitoYa";
const environmentName = process.env.ENVIRONMENT || "test";

type Ctx = NarrowedContext<Context<Update>, MountMap["text"]>;

export default function setup() {
  bot.command("start", startCommandHandler);

  bot.command("enroll", enrollCommandHandler);

  bot.command("new", createGameHandler);

  bot.command("yes", rsvpCommandHandler("YES"));
  bot.command("no", rsvpCommandHandler("NO"));
  bot.command("maybe", rsvpCommandHandler("MAYBE"));

  bot.hears("cuantos", howManyHandler);

  bot.launch();

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

const startCommandHandler = async (ctx: Ctx) => {
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
};

const enrollCommandHandler = async (ctx: Ctx) => {
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
};

const createGameHandler = async (ctx: Ctx) => {
  try {
    const game = await insertGame({
      telegramChatId: ctx.chat.id,
      dateTime: parseDateISO("2022-03-30 17:00"),
      requiredPlayers: 10,
    });

    ctx.reply(
      `New Game has been scheduled for ${game.dateTime.toLocaleDateString()}`
    );
  } catch (error) {
    console.error(error);
    ctx.reply("Something went wrong creating a new game.");
  }
};

const rsvpCommandHandler = (rsvpOption: RsvpOption) => async (ctx: Ctx) => {
  console.log(`RSVP for UserId ${ctx.from.id} in Chat ${ctx.chat.id}`);

  try {
    const game = await rsvpViaTelegram({
      telegramChatId: ctx.chat.id,
      telegramUserId: ctx.from.id,
      rsvpOption: rsvpOption,
    });
    if (game) {
      console.log(
        `User ${ctx.from.id} has RSVPed in chat ${ctx.chat.id}. Option ${rsvpOption}`
      );
      ctx.reply(`User ${ctx.from.first_name} said ${rsvpOption}.`);
    } else {
      console.log(
        `User ${ctx.from.id} cannot RSVPed in chat ${ctx.chat.id} because there are no upcoming games`
      );
      ctx.reply(`There are no upcoming games for this group.`);
    }
  } catch (error) {
    console.error(error);
    ctx.reply("Something went during RSVP user");
  }
};

const howManyHandler = async (ctx: Ctx) => {
  const game = await getUpcoming(ctx.chat.id);
  if (!game) {
    bot.telegram.sendMessage(ctx.chat.id, "No upcoming games found.");
    return;
  }

  const status = computeRSVPStatus(game);

  ctx.reply(
    `Going: ${status.yes.length}\nMaybe: ${status.maybe.length}\nNot going: ${
      status.no.length
    }\n\n ${status.yes
      .map((value, index) => `${index + 1} ${value.telegramUserId}`)
      .join("\n")}`
  );
};
