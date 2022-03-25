import { getUpcoming } from "./game";
import { rsvpViaTelegram } from "./rsvp";

async function test_with_seed() {
  console.log("simple test_with_seed");

  const game = await getUpcoming();
  if (!game) {
    throw Error("No upcoming games");
  }

  return rsvpViaTelegram({
    gameId: game.id,
    rsvpOption: "MAYBE",
    telegramUserId: 123456,
  });
}

const promise = test_with_seed();

promise.then((result) => console.log(result));
