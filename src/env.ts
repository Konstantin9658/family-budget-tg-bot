import dotenv from "dotenv";
dotenv.config();

export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
export const WEBHOOK_URL = process.env.WEBHOOK_URL!;
