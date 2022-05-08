import { Game, Guest } from "@prisma/client";
import { db } from "./db";
import { GameWithGroup, getUpcoming } from "./game";
import { computeRSVPStatus } from "./rsvp";

type InsertGuestRequest = {
  telegramChatId: number;
  invitedByTelegramUserId: number;
  guestName: string;
};

type AddGuestReturn = {
  modifiedGame: Game;
  guest: Guest;
};

export async function addGuestViaTelegram(
  rsvpRequest: InsertGuestRequest
): Promise<AddGuestReturn | null> {
  const game: GameWithGroup = await getUpcoming(rsvpRequest.telegramChatId);

  if (!game) {
    return null;
  }

  const user = game.group.users?.find(
    (u) => u.telegramUserId === rsvpRequest.invitedByTelegramUserId
  );
  if (!user) {
    throw new Error(`User not found`);
  }

  const rsvpStatus = computeRSVPStatus(game);
  if (rsvpStatus.maxNumberReached) {
    throw new Error(
      "Max number of required players have confirmed already. No more guests can be added."
    );
  }

  const guest = {
    invitedByTelegramUserId: user.telegramUserId,
    guestNumber: game.guests.length + 1,
    guestName: rsvpRequest.guestName,
    createdAt: new Date(),
  };

  const modifiedGame = await db.game.update({
    where: { id: game.id },
    data: {
      guests: {
        push: guest,
      },
    },
  });

  return { modifiedGame, guest };
}
