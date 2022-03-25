import { Game } from "@prisma/client";
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
