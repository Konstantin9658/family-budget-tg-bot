import type { VercelRequest, VercelResponse } from "@vercel/node";
import { bot } from "../bot";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    await bot.handleUpdate(req.body);
    res.status(200).send("OK");
  } catch (error) {
    console.error("Ошибка обработки обновления:", error);
    res.status(500).send("Error");
  }
}
