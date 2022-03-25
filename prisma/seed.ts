import { PrismaClient } from "@prisma/client";
const prismaClient = new PrismaClient();

async function seed() {
  await prismaClient.user.createMany({
    data: [
      { firstName: "Fabricio", telegramId: 123456 },
      { firstName: "Pablo", telegramId: 456798 },
    ],
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
