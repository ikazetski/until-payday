import type {
  CurrencyCode,
  Expense,
  ExpenseCategoryItem,
  FixedExpense,
} from "@/domain/financeTypes";

export type PeriodBudgetSnapshot = {
  cycleStartDate: string;
  nextSalaryDate: string;
  monthlyBudget: number;
  currency: CurrencyCode;
  createdAt: string;
};

export type PersistedFinanceState = {
  monthlyBudget: number;
  salaryDay: number;
  currency: CurrencyCode;
  fixedExpenses: FixedExpense[];
  recentExpenses: Expense[];
  trackingStartedAt: string;
  configuredCurrentCycleStartDate?: string;
  configuredNextSalaryDate?: string;
  expenseCategories: ExpenseCategoryItem[];
  periodBudgetSnapshots: PeriodBudgetSnapshot[];
};

export type FinanceRepository = {
  load: () => PersistedFinanceState;
  save: (data: PersistedFinanceState) => void;
};

export type AsyncFinanceRepository = {
  load: () => Promise<PersistedFinanceState>;
  save: (data: PersistedFinanceState) => Promise<void>;
};
