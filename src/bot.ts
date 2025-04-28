import { Telegraf, Markup, Context } from "telegraf";
import dotenv from "dotenv";
import { ExpenseStat } from "./types";
import { initDb, openDb } from "./db";

dotenv.config();

export const CATEGORIES = ["Развлечения", "Продукты", "Авто", "Кредиты"];

const STATISTICS_BUTTON = "Показать статистику";
const RESET_BUTTON = "Сбросить статистику";

const userStates = new Map<number, string>();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN as string);

// === оборачиваем всё в функцию ===
async function startBot() {
  // Инициализация базы данных
  await initDb();

  bot.start((ctx: Context) => {
    return ctx.reply(
      "Привет! Это бот по подсчету трат за месяц. Чтобы начать, выбери категорию:",
      Markup.inlineKeyboard([
        CATEGORIES.map((category) =>
          Markup.button.callback(category, category)
        ),
        [
          Markup.button.callback(STATISTICS_BUTTON, "statistics"),
          Markup.button.callback(RESET_BUTTON, "reset"),
        ],
      ])
    );
  });

  // Обработка выбора категории
  bot.action(CATEGORIES, (ctx) => {
    const category = ctx.match[0];
    const userId = ctx.from?.id;

    if (!userId || !CATEGORIES.includes(category)) return;

    userStates.set(userId, category);

    return ctx.reply(
      `Вы выбрали категорию '${category}'. Теперь введите сумму:`,
      Markup.removeKeyboard()
    );
  });

  // Обработка ввода суммы трат
  bot.on("text", async (ctx) => {
    const userId = ctx.from?.id;
    const text = ctx.message.text;

    if (!userId) return;

    const category = userStates.get(userId);

    if (!category) {
      return ctx.reply("Пожалуйста, сначала выберите категорию!");
    }

    const amount = parseFloat(text);

    if (isNaN(amount)) {
      return ctx.reply("Это не число! Введи число");
    }

    const db = await openDb();
    await db.run(
      `INSERT INTO expenses (user_id, category, amount) VALUES (?, ?, ?)`,
      userId,
      category,
      amount
    );

    userStates.delete(userId);

    return ctx.reply(
      `Трата сохранена: ${category} на ${amount} руб. Хотите добавить еще одну?`,
      Markup.inlineKeyboard([
        CATEGORIES.map((category) =>
          Markup.button.callback(category, category)
        ),
        [
          Markup.button.callback(STATISTICS_BUTTON, "statistics"),
          Markup.button.callback(RESET_BUTTON, "reset"),
        ],
      ])
    );
  });

  // Обработка кнопки "Показать статистику"
  bot.action("statistics", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const db = await openDb();
    const stats = await db.all<ExpenseStat[]>(
      `
        SELECT category, SUM(amount) as total
        FROM expenses
        WHERE user_id = ?
        GROUP BY category
      `,
      userId
    );

    if (stats.length === 0) {
      return ctx.reply("У вас еще нет трат.");
    }

    let message = "Ваши траты по категориям:\n";
    stats.forEach((row: { category: string; total: number }) => {
      message += `${row.category}: ${row.total} руб.\n`;
    });

    return ctx.reply(
      message,
      Markup.inlineKeyboard([
        CATEGORIES.map((category) =>
          Markup.button.callback(category, category)
        ),
        [
          Markup.button.callback(STATISTICS_BUTTON, "statistics"),
          Markup.button.callback(RESET_BUTTON, "reset"),
        ],
      ])
    );
  });

  // Обработка кнопки "Сбросить статистику"
  bot.action("reset", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const db = await openDb();
    await db.run(`DELETE FROM expenses WHERE user_id = ?`, userId);

    return ctx.reply(
      "Ваша статистика сброшена.",
      Markup.inlineKeyboard([
        CATEGORIES.map((category) =>
          Markup.button.callback(category, category)
        ),
        [
          Markup.button.callback(STATISTICS_BUTTON, "statistics"),
          Markup.button.callback(RESET_BUTTON, "reset"),
        ],
      ])
    );
  });

  // Функция для отправки статистики в конце дня
  async function sendDailyStatistics() {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();

    if (currentHour === 21 && currentMinute === 59) {
      const db = await openDb();
      const users = await db.all<{ user_id: number }[]>(
        `SELECT DISTINCT user_id FROM expenses`
      );

      for (const user of users) {
        const userId = user.user_id;
        const stats = await db.all<ExpenseStat[]>(
          `
            SELECT category, SUM(amount) as total
            FROM expenses
            WHERE user_id = ?
            GROUP BY category
          `,
          userId
        );

        if (stats.length === 0) continue;

        let message = "Ваши траты за сегодня:\n";
        stats.forEach((row: { category: string; total: number }) => {
          message += `${row.category}: ${row.total} руб.\n`;
        });

        try {
          await bot.telegram.sendMessage(userId, message);
        } catch (error) {
          console.error(
            `Ошибка при отправке сообщения пользователю ${userId}:`,
            error
          );
        }
      }
    }
  }

  setInterval(sendDailyStatistics, 60000);

  bot.launch({
    webhook: {
      domain: "https://family-budget-tg-bot.vercel.app",
      path: "/api/telegram",
    },
  });
}

// Запускаем
startBot().catch(console.error);

export default bot;
