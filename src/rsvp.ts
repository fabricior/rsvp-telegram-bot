import { Game, Rsvp } from "@prisma/client";
import { db } from "./db";
import { GameWithGroup, getUpcoming } from "./game";

type RsvpOption = "YES" | "NO" | "MAYBE";

type RsvpRequest = {
  telegramChatId: number;
  telegramUserId: number;
  rsvpOption: RsvpOption;
};

export type RSVPStatus = {
  yes: Rsvp[];
  no: Rsvp[];
  maybe: Rsvp[];
  unknown: Rsvp[];
};

export async function rsvpViaTelegram(
  rsvpRequest: RsvpRequest
): Promise<Game | null> {
  const game: GameWithGroup = await getUpcoming(rsvpRequest.telegramChatId);

  if (!game) {
    return null;
  }

  const user = game.group.users?.find(
    (u) => u.telegramUserId === rsvpRequest.telegramUserId
  );
  if (!user) {
    throw new Error(`User not found`);
  }

  const rsvpStatus = computeRSVPStatus(game);
  if (
    rsvpStatus.yes.length >= game.requiredPlayers &&
    rsvpRequest.rsvpOption === "YES"
  ) {
    const previousRsvp = game.rsvps?.find(
      (x) => x.telegramUserId === user.telegramUserId
    )?.option;
    const willIncreaseGoingCount = previousRsvp && previousRsvp !== "YES";
    if (willIncreaseGoingCount) {
      throw new Error("Max number of required players have confirmed already.");
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

export function computeRSVPStatus(game: Game): RSVPStatus {
  const userRsvps = getlatestRsvpPerUser(game.rsvps);

  const initialState: RSVPStatus = {
    yes: [],
    no: [],
    maybe: [],
    unknown: [], // TODO: unkwnows would be the ones in game.group.users that are not in userRsvps
  };

  return userRsvps.reduce(
    (previous, current) => ({
      ...previous,
      goingCount:
        current.option === "YES"
          ? [...previous.yes, current]
          : [...previous.yes],
      notGoingCount:
        current.option === "NO" ? [...previous.no, current] : [...previous.no],
      maybeCount:
        current.option === "MAYBE"
          ? [...previous.no, current]
          : [...previous.no],
    }),
    initialState
  );
}

function getlatestRsvpPerUser(rsvps: Array<Rsvp>): Array<Rsvp> {
  const buildRecord = () =>
    rsvps.reduce((previous, currentItem) => {
      const groupKey = currentItem.telegramUserId;
      if (
        !previous[groupKey] ||
        previous[groupKey].createdAt < currentItem.createdAt
      ) {
        previous[groupKey] = currentItem;
      }
      return previous;
    }, {} as Record<string, Rsvp>);

  return Object.values(buildRecord());
}
