import { PrismaClient } from "@prisma/client";
const prismaClient = new PrismaClient();

async function seed() {
  await prismaClient.group.create({
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
        requiredPlayers: 10,
        dateTime: new Date(Date.UTC(2022, 4, 4, 23, 0, 0)),
      },
      {
        requiredPlayers: 10,
        dateTime: new Date(Date.UTC(2023, 4, 4, 23, 0, 0)),
      },
    ],
  });
}

seed();
