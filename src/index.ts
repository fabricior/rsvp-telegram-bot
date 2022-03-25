import { insertGame } from "./game";
import { rsvpViaTelegram } from "./rsvp";

function init() {
    console.log("Test!");
    insertGame();
    rsvpViaTelegram({ telegramUserId: 112312331 });
}

init()
