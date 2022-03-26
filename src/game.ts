import { Game, Rsvp } from "@prisma/client";
import { db } from "./db";

export async function insertGame(): Promise<Game> {
  return await db.game.create({
    data: {
      requiredPlayers: 10,
      dateTime: new Date(Date.UTC(2023, 4, 4, 23, 0, 0)),
    },
  });
}

export async function getUpcoming(): Promise<Game | null> {
  const now = new Date();
  return await db.game.findFirst({
    where: {
      dateTime: {
        gt: now,
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
      const groupKey = currentItem.userId;
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
