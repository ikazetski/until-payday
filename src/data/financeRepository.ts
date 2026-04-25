import type {
  CurrencyCode,
  Expense,
  ExpenseCategoryItem,
  FixedExpense,
} from "@/domain/financeTypes";

export type PersistedFinanceState = {
  monthlyBudget: number;
  salaryDay: number;
  currency: CurrencyCode;
  fixedExpenses: FixedExpense[];
  recentExpenses: Expense[];
  trackingStartedAt: string;
  expenseCategories: ExpenseCategoryItem[];
};

export type FinanceRepository = {
  load: () => PersistedFinanceState;
  save: (data: PersistedFinanceState) => void;
};