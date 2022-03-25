import { Game, RsvpOption } from "@prisma/client";
import { db } from "./db";

type RsvpRequest = {
  gameId: string;
  telegramUserId: number;
  rsvpOption: RsvpOption;
};

export async function rsvpViaTelegram(rsvpRequest: RsvpRequest): Promise<Game> {
  const game = await db.game.findFirst({
    where: { id: { equals: rsvpRequest.gameId } },
  });

  if (!game) {
    throw new Error(`Game ${rsvpRequest.gameId} not found`);
  }

  const user = await db.user.findFirst({
    where: { telegramId: { equals: rsvpRequest.telegramUserId } },
  });

  if (!user) {
    throw new Error(`User not found`);
  }

  return await db.game.update({
    where: { id: rsvpRequest.gameId },
    data: {
      rsvps: {
        push: {
          userId: user.id,
          option: rsvpRequest.rsvpOption,
          createdAt: new Date(),
        },
      },
    },
  });
}
