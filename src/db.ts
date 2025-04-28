import sqlite3 from "better-sqlite3";

// Открываем базу данных
const db = new sqlite3("./expenses.db", { verbose: console.log });

// Создаем таблицу, если она не существует
db.prepare(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    category TEXT,
    amount REAL
  )
`).run();

export default db;
