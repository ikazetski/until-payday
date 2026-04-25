import type { CurrencyCode, ExpenseCategoryItem } from "@/domain/financeTypes";

export const DEFAULT_MONTHLY_BUDGET = 0;
export const DEFAULT_SALARY_DAY = 25;
export const DEFAULT_CURRENCY: CurrencyCode = "BYN";

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryItem[] = [
  { id: "food", name: "Еда", system: true },
  { id: "sport", name: "Спорт", system: true },
  { id: "fuel", name: "Топливо", system: true },
  { id: "entertainment", name: "Развлечения", system: true },
  { id: "other", name: "Другое", system: true },
];