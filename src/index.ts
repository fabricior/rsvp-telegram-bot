import dotenv from "dotenv";
import setupBot from "./bot";
import startHealthCheckServer from "./healthCheck";

dotenv.config();
setupBot();
startHealthCheckServer();