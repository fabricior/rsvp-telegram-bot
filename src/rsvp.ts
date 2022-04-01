import { Game, Group, Rsvp } from "@prisma/client";
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
  unknown: string[];
  details: string;
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

export function computeRSVPStatus(game: Game & { group: Group }): RSVPStatus {
  const userRsvps = getlatestRsvpPerUser(game.rsvps);

  const initialState: RSVPStatus = {
    yes: [],
    no: [],
    maybe: [],
    unknown: [],
    details: "",
  };

  const status = userRsvps.reduce(
    (previous, current) => ({
      ...previous,
      yes:
        current.option === "YES"
          ? [...previous.yes, current]
          : [...previous.yes],
      no:
        current.option === "NO" ? [...previous.no, current] : [...previous.no],
      maybe:
        current.option === "MAYBE"
          ? [...previous.no, current]
          : [...previous.no],
    }),
    initialState
  );

  status.details = `${status.yes
    .map(
      (value, index) =>
        `${index + 1}. ${
          game.group.users.find(
            (user) => user.telegramUserId === value.telegramUserId
          )?.firstName
        }`
    )
    .join("\n")}`;

  const userThatHaveNoRsvped = game.group.users.filter(
    (user) =>
      userRsvps.findIndex((r) => r.telegramUserId === user.telegramUserId) ===
      -1
  );

  status.unknown = userThatHaveNoRsvped.map(user => `- ${user.firstName} ?`);

  return status;
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
