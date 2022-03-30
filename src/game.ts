import { Game, Prisma } from "@prisma/client";
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


