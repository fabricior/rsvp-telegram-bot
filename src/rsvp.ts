import { Game, RsvpOption } from "@prisma/client";
import { db } from "./db";
import { computeRSVPStatus, getUpcoming } from "./game";
import { getGroup } from "./group";

type RsvpRequest = {
  telegramChatId: number;
  telegramUserId: number;
  rsvpOption: RsvpOption;
};

export async function rsvpViaTelegram(rsvpRequest: RsvpRequest): Promise<Game> {
  const game = await getUpcoming(rsvpRequest.telegramChatId)

  if (!game) {
    throw new Error(`No upcoming games found`);
  }

  const group = await getGroup(rsvpRequest.telegramChatId);
  if (!group) {
    throw new Error(`Group not found`);
  }

  const user = group.users?.find(u => u.telegramUserId === rsvpRequest.telegramUserId)
  if (!user) {
    throw new Error(`User not found`);
  }

  const rsvpStatus = computeRSVPStatus(game)
  if (rsvpStatus.goingCount >= game.requiredPlayers && rsvpRequest.rsvpOption === "YES") {
    const previousRsvp = game.rsvps?.find(x => x.telegramUserId === user.telegramUserId)?.option;
    const willIncreaseGoingCount =  previousRsvp && previousRsvp !== "YES"
    if (willIncreaseGoingCount) {
      throw new Error('Max number of required players have confirmed already.')
    }
  }

  return await db.game.update({
    where: { id: game.id },
    data: {
      rsvps: {
        push: {
          telegramUserId: user.telegramUserId,
          option: rsvpRequest.rsvpOption,
          createdAt: new Date(),
        },
      },
    },
  });
}
