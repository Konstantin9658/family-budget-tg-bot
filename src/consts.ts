import { Categories } from "./types";

export const CATEGORIES = ["Развлечения", "Продукты", "Авто", "Кредиты"];

export const STATISTICS_BUTTON = "Показать статистику";
export const RESET_BUTTON = "Сбросить статистику";

export const categoryMap: { [key: string]: Categories } = {
  Развлечения: Categories.Entertainment,
  Продукты: Categories.Goods,
  Авто: Categories.Auto,
  Кредиты: Categories.Credit,
};

export const reverseCategoryMap: { [key: string]: string } = {
  [Categories.Entertainment]: "Развлечения",
  [Categories.Goods]: "Продукты",
  [Categories.Auto]: "Авто",
  [Categories.Credit]: "Кредиты"
};