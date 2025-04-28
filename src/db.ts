import sqlite3 from "sqlite3";
import { open } from "sqlite";

// Функция для открытия БД
export async function openDb() {
  return open({
    filename: "./expenses.db",
    driver: sqlite3.Database,
  });
}

// Инициализация таблицы
export async function initDb() {
  const db = await openDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      category TEXT,
      amount REAL
    )
  `);
  return db;
}
