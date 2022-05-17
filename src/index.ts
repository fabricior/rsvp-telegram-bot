import express from "express";
import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import setupBot from "./bot";
import { CustomContext } from "./botTypes";
import winston from "winston";

dotenv.config();

const { TELEGRAM_BOT_TOKEN } = process.env;
if (TELEGRAM_BOT_TOKEN === undefined) {
  throw new Error("TELEGRAM_BOT_TOKEN not provided.");
}

const logger: winston.Logger = winston.createLogger({
  level: "info",
  transports: [new winston.transports.Console()],
});

const bot = new Telegraf<CustomContext>(TELEGRAM_BOT_TOKEN);
bot.context.logger = logger;

bot.context.logger.log("info", "Bot started.");

setupBot(bot);

bot.context.logger.log("info", "Bot setup finished.");

const secretPath = `/telegraf/${bot.secretPathComponent()}`;

const {
  GOOGLE_CLOUD_PROJECT_ID,
  GOOGLE_CLOUD_REGION,
  K_SERVICE,
  FALLBACK_BASE_URL,
} = process.env;

const isGoogleCloud = K_SERVICE !== undefined;
if (isGoogleCloud) {
  const baseUrl = `https://${GOOGLE_CLOUD_REGION}-${GOOGLE_CLOUD_PROJECT_ID}.cloudfunctions.net/${K_SERVICE}`;
  logger.info(`hook will listen on ${baseUrl} + "secret path"`);

  bot.telegram.setWebhook(`${baseUrl}${secretPath}`);
} else if (FALLBACK_BASE_URL !== undefined) {
  logger.info(`hook will listen on ${FALLBACK_BASE_URL} + "secret path"`);
  // set FALLBACK_BASE_URL to the url returned as a result of running:
  // lt --port 3001
  bot.telegram.setWebhook(`${FALLBACK_BASE_URL}${secretPath}`);
} else {
  logger.error("No webhook base URL provided.");
  process.exit(1);
}

logger.info(`webhook has been set.`);

const app = express();
app.get("/", (_, res) => {
  res.send({ status: "fully functional" });
});

app.use(bot.webhookCallback(secretPath));

const port = 3001;
const server = app.listen(port, () => {
  logger.info(`Bot server listening on port ${port}!`);
});

const gracefullShutdown = (signal: string) => {
  logger.info(`${signal} signal received.`);
  logger.info("Closing HTTP server...");
  server.close((err) => {
    logger.info("HTTP server closed");
    process.exit(err ? 1 : 0);
  });
};

process.once("SIGINT", gracefullShutdown);
process.once("SIGTERM", gracefullShutdown);

process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

export const cloudEntryPoint = app;
