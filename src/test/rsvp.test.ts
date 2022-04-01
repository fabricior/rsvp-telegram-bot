import { Game, Group } from "@prisma/client";
import { computeRSVPStatus } from "../rsvp";

test("RSVP status with all states", () => {
  // Arrange
  const dummyCreatedAtDateForPlayers = new Date(Date.UTC(2019, 4, 4, 1, 0, 0));
  const dummyCreatedAtDateForRsvps = new Date(Date.UTC(2022, 1, 1, 1, 0, 0));

  const game: Game & { group: Group } = {
    dateTime: new Date(Date.UTC(2022, 4, 4, 23, 0, 0)),
    requiredPlayers: 10,
    groupId: "group1",
    rsvps: [
      {
        telegramUserId: 456789,
        createdAt: dummyCreatedAtDateForRsvps,
        option: "YES",
      },
    ],
    id: "game1",
    group: {
      id: "group1",
      telegramChatId: 999,
      users: [
        {
          firstName: "Player1",
          createdAt: dummyCreatedAtDateForPlayers,
          telegramUserId: 123456789,
        },
        {
          firstName: "Player2",
          createdAt: dummyCreatedAtDateForPlayers,
          telegramUserId: 456789,
        },
      ],
    },
  };

  // Act
  const actual = computeRSVPStatus(game);

  // Assert
  expect(actual).toStrictEqual({
    yes: [
      {
        telegramUserId: 456789,
        createdAt: dummyCreatedAtDateForRsvps,
        option: "YES",
      },
    ],
    no: [],
    maybe: [],
    unknown: ['- Player1 ?'],
    details: "1. Player2",
  });
});