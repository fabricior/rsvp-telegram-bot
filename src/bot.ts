import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import { computeRSVPStatus, getUpcoming } from "./game";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN || "";
const bot = new Telegraf(token);

export default function setup() {
  bot.command("start", (ctx) => {
    console.log(ctx.from);

    bot.telegram.sendMessage(ctx.chat.id, "hello there! I'm FulbitoBot.", {});
  });

  bot.hears("cuantos", async (ctx, next) => {
    console.dir(ctx.state);

    const game = await getUpcoming();
    if (!game) {
      bot.telegram.sendMessage(ctx.chat.id, "No upcoming games found.");
      return;
    }

    ctx.reply(`Hello ${ctx.state.role}`);

    const status = computeRSVPStatus(game);

    bot.telegram.sendMessage(
      ctx.chat.id,
      `Going: ${status.goingCount}\nMaybe: ${status.maybeCount}\nNot going: ${status.notGoingCount} `
    );
  });

  bot.launch();

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
