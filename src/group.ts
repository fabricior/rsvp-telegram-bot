import { Group, User } from "@prisma/client";
import { db } from "./db";

export async function insertGroup(
  telegramChatId: number,
  language: string
): Promise<Group> {
  return await db.group.create({
    data: {
      telegramChatId,
      language,
    },
  });
}

type EnrollUserRequest = {
  telegramChatId: number;
  user: Omit<User, "createdAt">;
};

export async function enrollUserInGroup(
  request: EnrollUserRequest
): Promise<Group | null> {
  const group = await getGroup(request.telegramChatId);
  if (!group) {
    throw new Error("Group not found");
  }

  if (
    group.users?.findIndex(
      (u) => u.telegramUserId === request.user.telegramUserId
    ) !== -1
  ) {
    return null;
  }

  return await db.group.update({
    where: { telegramChatId: request.telegramChatId },
    data: {
      users: {
        push: {
          telegramUserId: request.user.telegramUserId,
          firstName: request.user.firstName,
          createdAt: new Date(),
        },
      },
    },
  });
}

export async function getGroup(telegramChatId: number): Promise<Group | null> {
  const group = await db.group.findFirst({
    where: { telegramChatId: { equals: telegramChatId } },
  });

  return group;
}
