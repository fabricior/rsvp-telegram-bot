import { Group } from ".prisma/client";
import { db } from "./db";

export async function insertGroup(telegramChatId: number): Promise<Group> {
  return await db.group.create({
    data: {
      telegramChatId: telegramChatId,
    },
  });
}

export async function getGroup(telegramChatId: number): Promise<Group | null> {
  const group = await db.group.findFirst({
    where: { telegramChatId: { equals: telegramChatId } },
  });

  return group;
}
