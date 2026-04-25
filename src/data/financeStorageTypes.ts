import type {
  CurrencyCode,
  Expense,
  ExpenseCategoryItem,
  FixedExpense,
} from "@/hooks/useFinanceStore";

export const FINANCE_STORAGE_KEY = "until-payday-finance";
export const CURRENT_FINANCE_SCHEMA_VERSION = 1;

export type LegacyFinanceStorageData = {
  monthlyBudget?: unknown;
  salaryDay?: unknown;
  currency?: unknown;
  fixedExpenses?: unknown;
  recentExpenses?: unknown;
  trackingStartedAt?: unknown;
  expenseCategories?: unknown;
};

export type PersistedFinanceDataV1 = {
  schemaVersion: 1;
  data: {
    monthlyBudget: number;
    salaryDay: number;
    currency: CurrencyCode;
    fixedExpenses: FixedExpense[];
    recentExpenses: Expense[];
    trackingStartedAt: string;
    expenseCategories: ExpenseCategoryItem[];
  };
};

export const FINANCE_STORAGE_BACKUP_KEY =
  "until-payday-finance-backup-before-v1";