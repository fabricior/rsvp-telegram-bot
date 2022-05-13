import { Game, Group, Rsvp } from "@prisma/client";
import { db } from "./db";
import { getUpcoming } from "./game";

type RsvpOption = "YES" | "NO" | "MAYBE";

type RsvpRequest = {
  group: Group;
  telegramChatId: number;
  telegramUserId: number;
  rsvpOption: RsvpOption;
};

export type RSVPStatus = {
  yes: Rsvp[];
  no: Rsvp[];
  maybe: Rsvp[];
  unknown: string[];
  guestCount: number;
  details: string;
  maxNumberReached: boolean;
};

export async function rsvpViaTelegram(
  rsvpRequest: RsvpRequest
): Promise<Game | null> {
  const game = await getUpcoming(rsvpRequest.telegramChatId);

  if (!game) {
    return null;
  }

  const user = rsvpRequest.group.users?.find(
    (u) => u.telegramUserId === rsvpRequest.telegramUserId
  );
  if (!user) {
    throw new Error(`User not found`);
  }

  const rsvpStatus = computeRSVPStatus(game, rsvpRequest.group);
  if (rsvpStatus.maxNumberReached && rsvpRequest.rsvpOption === "YES") {
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

export function computeRSVPStatus(game: Game, group: Group): RSVPStatus {
  const userRsvps = getlatestRsvpPerUser(game.rsvps);

  const initialState: RSVPStatus = {
    yes: [],
    no: [],
    maybe: [],
    guestCount: 0,
    unknown: [],
    details: "",
    maxNumberReached: false,
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

  status.guestCount = game.guests.length;

  status.details = `${status.yes
    .map(
      (value, yesIndex) =>
        `${yesIndex + 1}. ${findUserName(group, value.telegramUserId)}`
    )
    .join("\n")}\n${game.guests
    .map(
      (g, guestIndex) =>
        `${status.yes.length + guestIndex + 1}. ${g.guestName} (guest #${
          g.guestNumber
        } - Invited by ${findUserName(group, g.invitedByTelegramUserId)})`
    )
    .join("\n")}`;

  const userThatHaveNoRsvped = group.users.filter(
    (user) =>
      userRsvps.findIndex((r) => r.telegramUserId === user.telegramUserId) ===
      -1
  );

  status.unknown = userThatHaveNoRsvped.map((user) => `- ${user.firstName} ?`);

  status.maxNumberReached =
    status.yes.length + status.guestCount >= game.requiredPlayers;

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

function findUserName(group: Group, telegramUserId: number): string {
  if (group === null) {
    return "";
  }

  return (
    group.users.find((user) => user.telegramUserId === telegramUserId)
      ?.firstName ?? ""
  );
}
