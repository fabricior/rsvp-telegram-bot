import { Context, NarrowedContext, Telegraf } from "telegraf";
import dotenv from "dotenv";
import { getUpcoming, insertGame } from "./game";
import { enrollUserInGroup, insertGroup } from "./group";
import { Prisma, RsvpOption } from "@prisma/client";
import { computeRSVPStatus, rsvpViaTelegram } from "./rsvp";
import { Update } from "typegram/update";
import { MountMap } from "telegraf/typings/telegram-types";
import { parseDateISO } from "./dates";
import { addGuestViaTelegram, deleteGuestViaTelegram } from "./guest";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN || "";
const bot = new Telegraf(token);

const robotName = process.env.ROBOT_NAME || "RsvpBot";
const environmentName = process.env.ENVIRONMENT || "test";

type Ctx = NarrowedContext<Context<Update>, MountMap["text"]>;

export default function setup() {
  bot.command("init", initCommandHandler);

  bot.command("enroll", enrollCommandHandler);

  bot.command("new", createGameHandler);

  bot.command("yes", rsvpCommandHandler("YES"));
  bot.command("no", rsvpCommandHandler("NO"));
  bot.command("maybe", rsvpCommandHandler("MAYBE"));

  bot.command("status", statusHandler);

  bot.command("guest_add", addGuestHandler);
  bot.command("guest_remove", removeGuestHandler);

  bot.launch();

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

const initCommandHandler = async (ctx: Ctx) => {
  console.log(`Initializing bot for ChatId ${ctx.chat.id}`);

  const handleUknownError = (error: Error | unknown) => {
    console.error(error);
    ctx.reply("Something went wrong initializing Bot");
  };

  const enrollReminder =
    "Each player needs to send the /enroll command to let the bot know they want to interat with it. This needs to be done just once per user.";

  try {
    await insertGroup(ctx.chat.id);
    console.log(`Bot initialized for ChatId ${ctx.chat.id}`);
    ctx.reply(
      `Hello there! This group is now ready to use ${robotName} (${environmentName}).\n\n${enrollReminder}`
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        ctx.reply(
          `${robotName} (${environmentName}) is already initialized for current group.\n\n${enrollReminder}`
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
      ctx.reply(`User '${ctx.from.first_name}' has been enrolled.`);
    } else {
      console.log(
        `User ${ctx.from.id} was already enrolled in chat ${ctx.chat.id}. No action was performed.`
      );
      ctx.reply(
        `User '${ctx.from.first_name}' was enrolled already. /enroll is a one-off action for each user.`
      );
    }
  } catch (error) {
    console.error(error);
    ctx.reply(
      "Something went wrong enrolling user. Has the bot being initialized for this group? Send /init and trye again."
    );
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
      `A new game has been ${getScheduledForDateTimeText(
        game.dateTime
      )}.\n\nMaximum number of players: ${
        game.requiredPlayers
      }\n\nRSVP by sending any of the below commands:\n/yes if you are planning to attend.\n/no if you can't make it.\n/maybe if you are not sure.\n\nYour responses can be changed later at any time.\n\nTo check the attendance of players, please use the /status command.`
    );
  } catch (error) {
    console.error(error);
    ctx.reply(
      "Something went wrong creating a new game. Has the bot being initialized for this group? Send /init and try again."
    );
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
      ctx.reply(`User '${ctx.from.first_name}' said '${rsvpOption}'.`);
    } else {
      console.log(
        `User ${ctx.from.id} cannot RSVPed in chat ${ctx.chat.id} because there are no upcoming games`
      );
      ctx.reply(`There are no upcoming games for this group.`);
    }
  } catch (error) {
    console.error(error);
    ctx.reply("Something went wrong during RSVP user");
  }
};

const statusHandler = async (ctx: Ctx) => {
  const game = await getUpcoming(ctx.chat.id);
  if (!game) {
    bot.telegram.sendMessage(ctx.chat.id, "No upcoming games found.");
    return;
  }

  const status = computeRSVPStatus(game);

  ctx.reply(
    `Game ${getScheduledForDateTimeText(game.dateTime)}\n\nGoing: ${
      status.yes.length + status.guestCount
    }\nNot going: ${status.no.length}\nMaybe: ${status.maybe.length}${
      status.details ? `\n\n${status.details}` : ""
    } ${
      status.unknown.length > 0
        ? `\n\nPlayers with pending RSVP:\n${status.unknown}`
        : "\n\nAll players in this group have replied."
    }`
  );
};

const addGuestHandler = async (ctx: Ctx) => {
  const commandTextParts = ctx.update.message.text.split(" ");
  if (commandTextParts.length < 2) {
    ctx.reply(`There are no enough arguments in \`/guest_add\` command.`);
    return;
  }

  const [, guestName] = commandTextParts;

  console.log(
    `Adding Guest ${guestName} in Chat ${ctx.chat.id} by User ${ctx.from.id}`
  );

  const request = {
    telegramChatId: ctx.chat.id,
    guestName: guestName,
    invitedByTelegramUserId: ctx.from.id,
  };

  try {
    const result = await addGuestViaTelegram(request);
    if (result) {
      console.log(
        `Guest ${guestName} has been added to game in chat ${ctx.chat.id}.`
      );
      ctx.reply(
        `Guest '${guestName} (#${result.guest.guestNumber})' has been added.`
      );
    } else {
      console.log(
        `Guest ${guestName} cannot be added to game chat ${ctx.chat.id} because there are no upcoming games`
      );
      ctx.reply(`There are no upcoming games for this group.`);
    }
  } catch (error) {
    console.error(error);
    ctx.reply("Something went wrong adding guest.");
  }
};

const removeGuestHandler = async (ctx: Ctx) => {
  const commandTextParts = ctx.update.message.text.split(" ");
  if (commandTextParts.length < 2) {
    ctx.reply(`There are no enough arguments in \`/guest_remove\` command.`);
    return;
  }

  const [, guestNumberRaw] = commandTextParts;

  console.log(
    `Removing Guest ${guestNumberRaw} in Chat ${ctx.chat.id} by User ${ctx.from.id}`
  );

  const request = {
    telegramChatId: ctx.chat.id,
    guestNumber: parseInt(guestNumberRaw, 10),
    deletedByTelegramUserId: ctx.from.id,
  };

  try {
    const result = await deleteGuestViaTelegram(request);
    if (result) {
      console.log(
        `Guest ${request.guestNumber} has been removed from game in chat ${ctx.chat.id}.`
      );
      ctx.reply(
        `Guest '#${request.guestNumber}' has been removed.`
      );
    } else {
      console.log(
        `Guest ${request.guestNumber} cannot be removed from the game in chat ${ctx.chat.id} because there are no upcoming games`
      );
      ctx.reply(`There are no upcoming games for this group.`);
    }
  } catch (error) {
    console.error(error);
    ctx.reply("Something went wrong removing the guest.");
  }
};

function getScheduledForDateTimeText(dateTime: Date) {
  return `scheduled for ${dateTime.toLocaleDateString()} at ${dateTime.toLocaleTimeString(
    [],
    { hour: "2-digit", minute: "2-digit" }
  )}`;
}
