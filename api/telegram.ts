import { VercelRequest, VercelResponse } from "@vercel/node";
import bot from "../src/bot";

const webhookCallback = bot.webhookCallback("/api/telegram");

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  webhookCallback(req as any, res as any);
}
