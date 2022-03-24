import { PrismaClient } from "@prisma/client";
const prismaClient = new PrismaClient();

async function seed() {
  await prismaClient.user.create({ data: { firstName: "Fabricio" } });
}

seed();
