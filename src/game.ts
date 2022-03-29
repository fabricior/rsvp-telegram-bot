import { Game, Rsvp, Prisma } from "@prisma/client";
import { db } from "./db";

type InsertGameRequest = Omit<Game, "id" | "rsvps">;

export async function insertGame(request: InsertGameRequest): Promise<Game> {
  return await db.game.create({
    data: {
      groupId: request.groupId,
      requiredPlayers: request.requiredPlayers,
      dateTime: request.dateTime,
    },
  });
}

export type GameWithGroup = Prisma.PromiseReturnType<typeof getUpcoming>;

export async function getUpcoming(
  telegramChatId: number
) {
  const now = new Date();
  return await db.game.findFirst({
    include: {
      group: true
    },
    where: {
      dateTime: {
        gt: now,
      },
      group: {
        telegramChatId: telegramChatId,
      },
    },
    orderBy: { dateTime: "asc" },
  });
}

type GameRsvpStatus = {
  goingCount: number;
  notGoingCount: number;
  maybeCount: number;
};

export function computeRSVPStatus(game: Game) {
  const userRsvps = getlatestRsvpPerUser(game);

  const initialState: GameRsvpStatus = {
    goingCount: 0,
    notGoingCount: 0,
    maybeCount: 0,
  };

  return userRsvps.reduce(
    (previous, current) => ({
      ...previous,
      goingCount:
        current.option === "YES"
          ? previous.goingCount + 1
          : previous.goingCount,
      notGoingCount:
        current.option === "NO"
          ? previous.notGoingCount + 1
          : previous.notGoingCount,
      maybeCount:
        current.option === "MAYBE"
          ? previous.maybeCount + 1
          : previous.maybeCount,
    }),
    initialState
  );
}

function getlatestRsvpPerUser(game: Game): Array<Rsvp> {
  const buildRecord = () =>
    game.rsvps.reduce((previous, currentItem) => {
      const groupKey = currentItem.telegramUserId;
      if (
        !previous[groupKey] ||
        previous[groupKey].createdAt < currentItem.createdAt
      ) {
        previous[groupKey] = currentItem;
      }
      return previous;
    }, {} as Record<string, Rsvp>);

  return Object.values(buildRecord());
}
