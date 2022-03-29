import { PrismaClient } from "@prisma/client";
const prismaClient = new PrismaClient();

async function seed() {
  const group = await prismaClient.group.create({
    data: {
      telegramChatId: 999,
      users: [
        { firstName: "Fabricio", telegramUserId: 123456 },
        { firstName: "Pablo", telegramUserId: 456789 },
      ],
    },
  });

  return await prismaClient.game.createMany({
    data: [
      {
        groupId: group.id,
        requiredPlayers: 10,
        dateTime: new Date(Date.UTC(2022, 4, 4, 23, 0, 0)),
      },
      {
        groupId: group.id,
        requiredPlayers: 10,
        dateTime: new Date(Date.UTC(2023, 4, 4, 23, 0, 0)),
      },
    ],
  });
}

seed();
