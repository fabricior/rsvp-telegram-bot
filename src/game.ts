import { Game, Prisma } from "@prisma/client";
import { db } from "./db";
import { getGroup } from "./group";

type InsertGameRequest = Omit<Game, "id" | "rsvps" | "groupId"> & { telegramChatId: number};

export async function insertGame(request: InsertGameRequest): Promise<Game> {

  const group = await getGroup(request.telegramChatId);
  if (!group) {
    throw new Error("Group not found");
  }

  return await db.game.create({
    data: {
      groupId: group.id,
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


