import { Telegraf, Markup, Context } from "telegraf";
import db from "./db"; // Импортируем подключение к базе данных
import dotenv from "dotenv";
import { ExpenseStat } from "./types";

dotenv.config();

// Массив категорий
export const CATEGORIES = ["Развлечения", "Продукты", "Авто", "Кредиты"];

// Кнопки для статистики и сброса
const STATISTICS_BUTTON = "Показать статистику";
const RESET_BUTTON = "Сбросить статистику";

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN as string);

// Временное хранилище выбранной категории
const userStates = new Map<number, string>();

// Команда старт
bot.start((ctx: Context) => {
  return ctx.reply(
    "Привет! Это бот по подсчету трат за месяц. Чтобы начать, выбери категорию:",
    Markup.inlineKeyboard([
      CATEGORIES.map((category) => Markup.button.callback(category, category)),
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

  // Сохраняем выбранную категорию
  userStates.set(userId, category);

  return ctx.reply(
    `Вы выбрали категорию '${category}'. Теперь введите сумму:`,
    Markup.removeKeyboard()
  );
});

// Обработка ввода суммы трат
bot.on("text", (ctx) => {
  const userId = ctx.from?.id;
  const text = ctx.message.text;

  if (!userId) return;

  const category = userStates.get(userId);

  if (!category) {
    // Если категория не выбрана, напомнить выбрать категорию
    return ctx.reply("Пожалуйста, сначала выберите категорию!");
  }

  const amount = parseFloat(text);

  if (isNaN(amount)) {
    return ctx.reply("Это не число! Введи число");
  }

  // Сохраняем трату в базу
  const stmt = db.prepare(`
    INSERT INTO expenses (user_id, category, amount)
    VALUES (?, ?, ?)
  `);
  stmt.run(userId, category, amount);

  userStates.delete(userId); // Сбрасываем выбор категории

  return ctx.reply(
    `Трата сохранена: ${category} на ${amount} руб. Хотите добавить еще одну?`,
    Markup.inlineKeyboard([
      CATEGORIES.map((category) => Markup.button.callback(category, category)),
      [
        Markup.button.callback(STATISTICS_BUTTON, "statistics"),
        Markup.button.callback(RESET_BUTTON, "reset"),
      ],
    ])
  );
});

// Обработка кнопки "Показать статистику"
bot.action("statistics", (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Получаем статистику из базы данных
  const stmt = db.prepare(`
    SELECT category, SUM(amount) as total
    FROM expenses
    WHERE user_id = ?
    GROUP BY category
  `);
  const stats = stmt.all(userId) as ExpenseStat[];

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
      CATEGORIES.map((category) => Markup.button.callback(category, category)),
      [
        Markup.button.callback(STATISTICS_BUTTON, "statistics"),
        Markup.button.callback(RESET_BUTTON, "reset"),
      ],
    ])
  );
});

// Обработка кнопки "Сбросить статистику"
bot.action("reset", (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Удаляем все трат пользователя из базы
  const stmt = db.prepare(`
    DELETE FROM expenses WHERE user_id = ?
  `);
  stmt.run(userId);

  return ctx.reply(
    "Ваша статистика сброшена.",
    Markup.inlineKeyboard([
      CATEGORIES.map((category) => Markup.button.callback(category, category)),
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
    // Получаем всех пользователей
    const usersStmt = db.prepare("SELECT DISTINCT user_id FROM expenses");
    const users = usersStmt.all() as { user_id: number }[];

    // Асинхронная отправка статистики для каждого пользователя
    for (const user of users) {
      const userId = user.user_id;

      // Получаем статистику для каждого пользователя
      const statsStmt = db.prepare(`
        SELECT category, SUM(amount) as total
        FROM expenses
        WHERE user_id = ?
        GROUP BY category
      `);
      const stats = statsStmt.all(userId) as ExpenseStat[];

      if (stats.length === 0) {
        continue; // Нет статистики для этого пользователя
      }

      let message = "Ваши траты за сегодня:\n";
      stats.forEach((row: { category: string; total: number }) => {
        message += `${row.category}: ${row.total} руб.\n`;
      });

      // Отправляем сообщение пользователю
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

export default bot;
