import { VercelRequest, VercelResponse } from "@vercel/node";
import { bot } from "../src/bot";
import { WEBHOOK_URL } from "../src/env";

const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === "POST") {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send("ok");
    } catch (error) {
      console.error("Ошибка обработки апдейта", error);
      res.status(500).send("error");
    }
  } else {
    res.status(200).send("Бот работает.");
  }
};

export default handler;

// Устанавливаем вебхук только один раз вручную!
if (process.env.NODE_ENV !== "production") {
  (async () => {
    try {
      await bot.telegram.setWebhook(WEBHOOK_URL);
      console.log(`Webhook установлен на ${WEBHOOK_URL}`);
    } catch (err) {
      console.error("Ошибка установки webhook:", err);
    }
  })();
}
