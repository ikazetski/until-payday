export type CurrencyCode = "BYN" | "EUR" | "USD" | "RUB" | "UAH";
export type ExpenseCategory = string;

export type Expense = {
  id: string;
  amount: number;
  category: ExpenseCategory;
  note?: string;
  createdAt: string;
};

export type FixedExpense = {
  id: string;
  name: string;
  amount: number;
};

export type ExpenseCategoryItem = {
  id: string;
  name: string;
  system?: boolean;
};

