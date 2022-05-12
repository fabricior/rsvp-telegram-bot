import { Game, Group, Prisma } from "@prisma/client";
import { db } from "./db";
import { getGroup } from "./group";

type InsertGameRequest = Omit<Game, "id" | "rsvps" | "groupId" | "guests"> & {
  telegramChatId: number;
};

export type GameWithGroupOrNull = Prisma.PromiseReturnType<typeof getUpcoming>;

export type GameWithGroup = {
  game: Game;
  group: Group;
};

export async function insertGame(
  request: InsertGameRequest
): Promise<GameWithGroup> {
  const group = await getGroup(request.telegramChatId);
  if (!group) {
    throw new Error("Group not found");
  }

  const game = await db.game.create({
    data: {
      groupId: group.id,
      requiredPlayers: request.requiredPlayers,
      dateTime: request.dateTime,
    },
  });

  if (!game) {
    throw new Error("Game cannot be added");
  }

  return { game, group };
}

export async function getUpcoming(telegramChatId: number) {
  const now = new Date();
  return await db.game.findFirst({
    include: {
      group: true,
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
