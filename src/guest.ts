import { Game, Guest } from "@prisma/client";
import { db } from "./db";
import { GameWithGroup, getUpcoming } from "./game";
import { computeRSVPStatus } from "./rsvp";

type InsertGuestRequest = {
  telegramChatId: number;
  invitedByTelegramUserId: number;
  guestName: string;
};

type DeleteGuestRequest = {
  telegramChatId: number;
  deletedByTelegramUserId: number;
  guestNumber: number;
};

type AddGuestReturn = {
  modifiedGame: Game;
  guest: Guest;
};

export async function addGuestViaTelegram(
  request: InsertGuestRequest
): Promise<AddGuestReturn | null> {
  const game: GameWithGroup = await getUpcoming(request.telegramChatId);

  if (!game) {
    return null;
  }

  const user = game.group.users?.find(
    (u) => u.telegramUserId === request.invitedByTelegramUserId
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
    guestName: request.guestName,
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

export async function deleteGuestViaTelegram(
  request: DeleteGuestRequest
): Promise<Game | null> {
  const game: GameWithGroup = await getUpcoming(request.telegramChatId);

  if (!game) {
    return null;
  }

  const user = game.group.users?.find(
    (u) => u.telegramUserId === request.deletedByTelegramUserId
  );
  if (!user) {
    throw new Error(`User not found`);
  }

  const guest = game.guests.find((x) => x.guestNumber === request.guestNumber);
  if (!guest) {
    throw new Error(`Guest not found`);
  }

  const newList = game.guests.filter(
    (x) => x.guestNumber !== request.guestNumber
  );

  return await db.game.update({
    where: { id: game.id },
    data: {
      guests: {
        set: newList,
      },
    },
  });
}
