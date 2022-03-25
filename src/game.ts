import { db } from "./db";

export async function insertGame() {
  await db.game.create({
    data: {
      requiredPlayers: 10,
      dateTime: new Date(Date.UTC(2022, 4, 4, 23, 0, 0)),
    },
  });
}

