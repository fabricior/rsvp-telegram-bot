import { Game, Group } from "@prisma/client";
import { db } from "./db";

type InsertGameRequest = Omit<Game, "id" | "rsvps" | "groupId" | "guests"> & {
  group: Group;
};

export async function insertGame(request: InsertGameRequest): Promise<Game> {  
  const game = await db.game.create({
    data: {
      groupId: request.group.id,
      requiredPlayers: request.requiredPlayers,
      dateTime: request.dateTime,
    },
  });

  return game;
}

export async function getUpcoming(telegramChatId: number) {
  const now = new Date();
  return await db.game.findFirst({
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
