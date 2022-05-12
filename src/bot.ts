import { Context, NarrowedContext, Telegraf } from "telegraf";
import i18next from "i18next";
import resources from "./translations";
import { getUpcoming, insertGame } from "./game";
import { enrollUserInGroup, insertGroup } from "./group";
import { Prisma, RsvpOption } from "@prisma/client";
import { computeRSVPStatus, rsvpViaTelegram } from "./rsvp";
import { Update } from "typegram/update";
import { MountMap } from "telegraf/typings/telegram-types";
import { parseDateISO } from "./dates";
import { addGuestViaTelegram, deleteGuestViaTelegram } from "./guest";

const token = process.env.TELEGRAM_BOT_TOKEN || "";
const bot = new Telegraf(token);

const robotName = process.env.ROBOT_NAME || "RsvpBot";
const environmentName = process.env.ENVIRONMENT || "test";

type Ctx = NarrowedContext<Context<Update>, MountMap["text"]>;

const defaultLanguage = "en";

i18next.init({
  lng: defaultLanguage,
  debug: true,
  resources: resources,
  fallbackLng: "en",
});

export default function setupBot() {
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
    console.error(error);
    ctx.reply(i18next.t("uknownError.init"));
  };

  try {
    if (language !== defaultLanguage) {
      await i18next.changeLanguage(language);
    }

    await insertGroup(ctx.chat.id, language);
    console.log(`Bot initialized for ChatId ${ctx.chat.id}`);
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
  console.log(`Enrolling UserId ${ctx.from.id} in Chat ${ctx.chat.id}`);

  try {
    const group = await enrollUserInGroup({
      telegramChatId: ctx.chat.id,
      user: { firstName: ctx.from.first_name, telegramUserId: ctx.from.id },
    });
    if (group) {
      await ensureLanguage(group.language)
      console.log(
        `User ${ctx.from.id} has been enrolled in chat ${ctx.chat.id}.`
      );
      ctx.reply(i18next.t("enroll.ok", { firstName: ctx.from.first_name }));
    } else {
      console.log(
        `User ${ctx.from.id} was already enrolled in chat ${ctx.chat.id}. No action was performed.`
      );
      ctx.reply(
        i18next.t("enroll.already", { firstName: ctx.from.first_name })
      );
    }
  } catch (error) {
    console.error(error);
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
    const result = await insertGame({
      telegramChatId: ctx.chat.id,
      dateTime: datetime,
      requiredPlayers: requiredPlayers,
    });

    await ensureLanguage(result.group.language)

    const gameDateTime = getScheduledForDateTimeText(result.game.dateTime);

    ctx.reply(
      i18next.t("gameCreated.ok", {
        gameDateTime,
        requiredPlayers: result.game.requiredPlayers,
      })
    );
  } catch (error) {
    console.error(error);
    ctx.reply(i18next.t("uknownError.newGame"));
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
      ctx.reply(
        i18next.t("rsvp.ok", { firstName: ctx.from.first_name, rsvpOption })
      );
    } else {
      console.log(
        `User ${ctx.from.id} cannot RSVPed in chat ${ctx.chat.id} because there are no upcoming games`
      );
      ctx.reply(i18next.t("noUpcomingGames"));
    }
  } catch (error) {
    console.error(error);
    ctx.reply(i18next.t("uknownError.rsvp"));
  }
};

const statusHandler = async (ctx: Ctx) => {
  const game = await getUpcoming(ctx.chat.id);
  if (!game) {
    ctx.reply(i18next.t("noUpcomingGames"));
    return;
  }

  await ensureLanguage(game.group.language)

  const status = computeRSVPStatus(game);
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
};

const addGuestHandler = async (ctx: Ctx) => {
  const commandTextParts = ctx.update.message.text.split(" ");
  if (commandTextParts.length < 2) {
    ctx.reply(i18next.t("guestAdded.notEnoughArgs"));
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
        i18next.t("guestAdded.ok", {
          guestName,
          guestNumber: result.guest.guestNumber,
        })
      );
    } else {
      console.log(
        `Guest ${guestName} cannot be added to game chat ${ctx.chat.id} because there are no upcoming games`
      );
      ctx.reply(i18next.t("noUpcomingGames"));
    }
  } catch (error) {
    console.error(error);
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
        i18next.t("guestRemoved.ok", {
          guestNumber: request.guestNumber,
        })
      );
    } else {
      console.log(
        `Guest ${request.guestNumber} cannot be removed from the game in chat ${ctx.chat.id} because there are no upcoming games`
      );
      ctx.reply(i18next.t("noUpcomingGames"));
    }
  } catch (error) {
    console.error(error);
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

async function ensureLanguage(language: string) {
  if (language !== i18next.language) {
    await i18next.changeLanguage(language);
  }
}
