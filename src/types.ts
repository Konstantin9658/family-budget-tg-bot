export enum Categories {
  Entertainment = "Развлечения",
  Auto = "Авто",
  Goods = "Продукты",
  Credit = "Кредиты",
}

export interface ExpenseStat {
  category: string;
  total: number;
}
