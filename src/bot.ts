import { Telegraf } from "telegraf";
import { Prisma, RsvpOption } from "@prisma/client";
import i18next from "i18next";
import { getUpcoming, insertGame } from "./game";
import { enrollUserInGroup, insertGroup } from "./group";
import { computeRSVPStatus, rsvpViaTelegram } from "./rsvp";
import { addGuestViaTelegram, deleteGuestViaTelegram } from "./guest";
import { parseDateISO } from "./dates";
import { groupMiddleware } from "./middleware";
import { Ctx, CustomContext } from "./botTypes";
import resources from "./translations";

const robotName = process.env.ROBOT_NAME || "RsvpBot";
const environmentName = process.env.NODE_ENV;

const defaultLanguage = "en";

i18next.init({
  lng: defaultLanguage,
  resources: resources,
  fallbackLng: "en",
});

export default function setupBot(bot: Telegraf<CustomContext>) {
  bot.use(groupMiddleware);

  bot.command("init", initCommandHandler);

  bot.command("enroll", enrollCommandHandler);

  bot.command("new", createGameHandler);

  bot.command("yes", rsvpCommandHandler("YES"));
  bot.command("no", rsvpCommandHandler("NO"));
  bot.command("maybe", rsvpCommandHandler("MAYBE"));

  bot.command("status", statusHandler);

  bot.command("guest_add", addGuestHandler);
  bot.command("guest_remove", removeGuestHandler);
}

const initCommandHandler = async (ctx: Ctx) => {
  ctx.logger.info(`Initializing bot for ChatId ${ctx.chat.id}`);

  const commandTextParts = ctx.update.message.text.split(" ");
  if (commandTextParts.length < 2) {
    ctx.reply(i18next.t("initialized.notEnoughArgs"));
    return;
  }

  const [, language] = commandTextParts;

  if (language !== "en" && language !== "es") {
    ctx.reply(i18next.t("initialized.invalidLanguage"));
    return;
  }

  const handleUknownError = (error: Error | unknown) => {
    ctx.logger.error(error);
    ctx.reply(i18next.t("uknownError.init"));
  };

  try {
    if (language !== defaultLanguage) {
      await i18next.changeLanguage(language);
    }

    await insertGroup(ctx.chat.id, language);
    ctx.logger.info(`Bot initialized for ChatId ${ctx.chat.id}`);
    ctx.reply(i18next.t("initialized.ok", { robotName, environmentName }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        ctx.reply(
          i18next.t("initialized.already", { robotName, environmentName })
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
  ctx.logger.info(`Enrolling UserId ${ctx.from.id} in Chat ${ctx.chat.id}`);

  try {
    const group = getGroupFromCtxOrThrowException(ctx);
    const modifiedGroup = await enrollUserInGroup({
      group: group,
      telegramChatId: ctx.chat.id,
      user: { firstName: ctx.from.first_name, telegramUserId: ctx.from.id },
    });
    if (modifiedGroup) {
      ctx.logger.info(
        `User ${ctx.from.id} has been enrolled in chat ${ctx.chat.id}.`
      );
      ctx.reply(i18next.t("enroll.ok", { firstName: ctx.from.first_name }));
    } else {
      ctx.logger.info(
        `User ${ctx.from.id} was already enrolled in chat ${ctx.chat.id}. No action was performed.`
      );
      ctx.reply(
        i18next.t("enroll.already", { firstName: ctx.from.first_name })
      );
    }
  } catch (error) {
    ctx.logger.error(error);
    ctx.reply(i18next.t("uknownError.enroll"));
  }
};

const createGameHandler = async (ctx: Ctx) => {
  const commandTextParts = ctx.update.message.text.split(" ");
  if (commandTextParts.length < 4) {
    ctx.reply(i18next.t("gameCreated.notEnoughArgs"));
    return;
  }
  const [, dateRaw, timeRaw, requiredPlayersRaw] = commandTextParts;
  const datetime = parseDateISO(`${dateRaw} ${timeRaw}`);
  const requiredPlayers = parseInt(requiredPlayersRaw);

  try {
    const group = getGroupFromCtxOrThrowException(ctx);
    const game = await insertGame({
      dateTime: datetime,
      requiredPlayers: requiredPlayers,
      group: group,
    });

    if (!game) {
      throw new Error("Game cannot be added");
    }

    const gameDateTime = getScheduledForDateTimeText(game.dateTime);

    ctx.reply(
      i18next.t("gameCreated.ok", {
        gameDateTime,
        requiredPlayers: game.requiredPlayers,
      })
    );
  } catch (error) {
    ctx.logger.error(error);
    ctx.reply(i18next.t("uknownError.newGame"));
  }
};

const rsvpCommandHandler = (rsvpOption: RsvpOption) => async (ctx: Ctx) => {
  ctx.logger.info(`RSVP for UserId ${ctx.from.id} in Chat ${ctx.chat.id}`);

  try {
    const group = getGroupFromCtxOrThrowException(ctx);

    const game = await rsvpViaTelegram({
      group,
      telegramChatId: ctx.chat.id,
      telegramUserId: ctx.from.id,
      rsvpOption: rsvpOption,
    });
    if (game) {
      ctx.logger.info(
        `User ${ctx.from.id} has RSVPed in chat ${ctx.chat.id}. Option ${rsvpOption}`
      );
      ctx.reply(
        i18next.t("rsvp.ok", { firstName: ctx.from.first_name, rsvpOption })
      );
    } else {
      ctx.logger.info(
        `User ${ctx.from.id} cannot RSVPed in chat ${ctx.chat.id} because there are no upcoming games`
      );
      ctx.reply(i18next.t("noUpcomingGames"));
    }
  } catch (error) {
    ctx.logger.error(error);
    ctx.reply(i18next.t("uknownError.rsvp"));
  }
};

const statusHandler = async (ctx: Ctx) => {
  const game = await getUpcoming(ctx.chat.id);
  if (!game) {
    ctx.reply(i18next.t("noUpcomingGames"));
    return;
  }

  try {
    const group = getGroupFromCtxOrThrowException(ctx);
    const status = computeRSVPStatus(game, group);
    const gameDateTime = getScheduledForDateTimeText(game.dateTime);
    const goingCount = status.yes.length + status.guestCount;
    const detailsSection = status.details ? `\n\n${status.details}` : "";
    const summary =
      status.unknown.length > 0
        ? `${i18next.t("status.playersWithPendingRsvp", {
            unknownList: status.unknown,
          })}`
        : i18next.t("status.allReplied");

    ctx.reply(
      i18next.t("status.main", {
        gameDateTime,
        goingCount,
        notGoingCount: status.no.length,
        maybeCount: status.maybe.length,
        summary,
        detailsSection,
      })
    );
  } catch (error) {
    ctx.logger.error(error);
    ctx.reply(i18next.t("uknownError.status"));
  }
};

const addGuestHandler = async (ctx: Ctx) => {
  const commandTextParts = ctx.update.message.text.split(" ");
  if (commandTextParts.length < 2) {
    ctx.reply(i18next.t("guestAdded.notEnoughArgs"));
    return;
  }

  const [, guestName] = commandTextParts;

  ctx.logger.info(
    `Adding Guest ${guestName} in Chat ${ctx.chat.id} by User ${ctx.from.id}`
  );

  try {
    const group = getGroupFromCtxOrThrowException(ctx);

    const result = await addGuestViaTelegram({
      group,
      telegramChatId: ctx.chat.id,
      guestName: guestName,
      invitedByTelegramUserId: ctx.from.id,
    });
    if (result) {
      ctx.logger.info(
        `Guest ${guestName} has been added to game in chat ${ctx.chat.id}.`
      );
      ctx.reply(
        i18next.t("guestAdded.ok", {
          guestName,
          guestNumber: result.guest.guestNumber,
        })
      );
    } else {
      ctx.logger.info(
        `Guest ${guestName} cannot be added to game chat ${ctx.chat.id} because there are no upcoming games`
      );
      ctx.reply(i18next.t("noUpcomingGames"));
    }
  } catch (error) {
    ctx.logger.error(error);
    ctx.reply(i18next.t("uknownError.addGuest"));
  }
};

const removeGuestHandler = async (ctx: Ctx) => {
  const commandTextParts = ctx.update.message.text.split(" ");
  if (commandTextParts.length < 2) {
    ctx.reply(i18next.t("guestRemoved.notEnoughArgs"));
    return;
  }

  const [, guestNumberRaw] = commandTextParts;

  ctx.logger.info(
    `Removing Guest ${guestNumberRaw} in Chat ${ctx.chat.id} by User ${ctx.from.id}`
  );

  try {
    const group = getGroupFromCtxOrThrowException(ctx);

    const guestNumber = parseInt(guestNumberRaw, 10);
    const result = await deleteGuestViaTelegram({
      group,
      telegramChatId: ctx.chat.id,
      guestNumber: guestNumber,
      deletedByTelegramUserId: ctx.from.id,
    });
    if (result) {
      ctx.logger.info(
        `Guest ${guestNumber} has been removed from game in chat ${ctx.chat.id}.`
      );
      ctx.reply(
        i18next.t("guestRemoved.ok", {
          guestNumber,
        })
      );
    } else {
      ctx.logger.info(
        `Guest ${guestNumber} cannot be removed from the game in chat ${ctx.chat.id} because there are no upcoming games`
      );
      ctx.reply(i18next.t("noUpcomingGames"));
    }
  } catch (error) {
    ctx.logger.error(error);
    ctx.reply(i18next.t("uknownError.removeGuest"));
  }
};

function getScheduledForDateTimeText(dateTime: Date) {
  return i18next.t("scheduledForDateTimeText", {
    value: dateTime,
    formatParams: {
      value: {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      },
    },
  });
}

function getGroupFromCtxOrThrowException(ctx: Ctx) {
  if (ctx.state.group === null) {
    throw new Error("Group not found");
  }

  return ctx.state.group;
}
