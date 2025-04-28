import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!TOKEN || !WEBHOOK_URL) {
  console.error("Ошибка: TELEGRAM_BOT_TOKEN или WEBHOOK_URL не заданы в .env");
  process.exit(1);
}

async function setWebhook() {
  try {
    const url = `https://api.telegram.org/bot${TOKEN}/setWebhook`;
    const res = await axios.post(url, { url: WEBHOOK_URL });
    console.log("Webhook установлен ✅", res.data);
  } catch (error) {
    console.error("Ошибка установки webhook:", error);
  }
}

setWebhook();
