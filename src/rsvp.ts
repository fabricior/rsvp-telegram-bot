import { db } from "./db";

type RsvpRequest = {
  telegramUserId: number;
};

export async function rsvpViaTelegram(rsvpRequest: RsvpRequest) {
  const game = await db.game.findFirst({
    orderBy: { dateTime: "desc" },
  });
  console.log(game);
  // // await db.game.upsert({ where: { id: rsvpRequest.gameId }, update: {  }, create: { gameId } });
  // //     id:
  // // }}) .create({
  // //   data: {
  // //     requiredPlayers: 10,
  // //     dateTime: new Date(Date.UTC(2022, 4, 4, 23, 0, 0)),
  // //   },
  // // });
}
