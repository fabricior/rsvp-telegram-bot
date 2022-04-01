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
    const group = await enrollUserInGroup({
      telegramChatId: ctx.chat.id,
      user: { firstName: ctx.from.first_name, telegramUserId: ctx.from.id },
    });
    if (group) {
      console.log(
        `User ${ctx.from.id} has been enrolled in chat ${ctx.chat.id}.`
      );
      ctx.reply(`User ${ctx.from.first_name} has been enrolled.`);
    } else {
      console.log(
        `User ${ctx.from.id} was already enrolled in chat ${ctx.chat.id}. No action was performed.`
      );
      ctx.reply(
        `User ${ctx.from.first_name} was enrolled already. /enroll is a one-off action for each user.`
      );
    }
  } catch (error) {
    console.error(error);
    ctx.reply("Something went wrong enrolling user");
  }
};

const createGameHandler = async (ctx: Ctx) => {
  const commandTextParts = ctx.update.message.text.split(" ");
  if (commandTextParts.length < 4) {
    ctx.reply(`There are no enough arguments in \`/new\` command.`);
    return;
  }
  const [, dateRaw, timeRaw, requiredPlayersRaw] = commandTextParts;
  const datetime = parseDateISO(`${dateRaw} ${timeRaw}`);
  const requiredPlayers = parseInt(requiredPlayersRaw);

  try {
    const game = await insertGame({
      telegramChatId: ctx.chat.id,
      dateTime: datetime,
      requiredPlayers: requiredPlayers,
    });

    ctx.reply(
      `New Game has been scheduled for ${game.dateTime.toLocaleDateString()} at ${game.dateTime.toLocaleTimeString()}. Number of required Players: ${game.requiredPlayers}\n\nRSVP by sending any of below commands:\n/yes if you are planning to attend.\n/no if you can't make it.\n/maybe if you are not sure.\n\nYour responses can be changed later at any time.`
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
    }${status.details ? `\n\n${status.details}` : ""} ${
      status.unknown.length > 0
        ? `\n\nPlayers with pending RSVP:\n${status.unknown}`
        : "\n\nAll players in this group have replied."
    }`
  );
};
