import type {
  CurrencyCode,
  Expense,
  ExpenseCategoryItem,
  FixedExpense,
} from "@/domain/financeTypes";
import {
  DEFAULT_CURRENCY,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_MONTHLY_BUDGET,
  DEFAULT_SALARY_DAY,
} from "@/domain/financeDefaults";
import {
  CURRENT_FINANCE_SCHEMA_VERSION,
  type LegacyFinanceStorageData,
  type PersistedFinanceDataV1,
} from "./financeStorageTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidCurrency(value: unknown): value is CurrencyCode {
  return (
    value === "BYN" ||
    value === "EUR" ||
    value === "USD" ||
    value === "RUB" ||
    value === "UAH"
  );
}

function normalizeMonthlyBudget(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : DEFAULT_MONTHLY_BUDGET;
}

function normalizeSalaryDay(value: unknown): number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 31
    ? value
    : DEFAULT_SALARY_DAY;
}

function normalizeCurrency(value: unknown): CurrencyCode {
  return isValidCurrency(value) ? value : DEFAULT_CURRENCY;
}

function normalizeTrackingStartedAt(value: unknown): string {
  return typeof value === "string" && value.length > 0
    ? value
    : new Date().toISOString();
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeExpenseCategories(value: unknown): ExpenseCategoryItem[] {
  const categories = normalizeArray<ExpenseCategoryItem>(value);

  return categories.length > 0 ? categories : DEFAULT_EXPENSE_CATEGORIES;
}

export function createDefaultPersistedFinanceData(): PersistedFinanceDataV1 {
  return {
    schemaVersion: CURRENT_FINANCE_SCHEMA_VERSION,
    data: {
      monthlyBudget: DEFAULT_MONTHLY_BUDGET,
      salaryDay: DEFAULT_SALARY_DAY,
      currency: DEFAULT_CURRENCY,
      fixedExpenses: [],
      recentExpenses: [],
      trackingStartedAt: new Date().toISOString(),
      expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    },
  };
}

export function isPersistedFinanceDataV1(
  value: unknown
): value is PersistedFinanceDataV1 {
  return (
    isRecord(value) && value.schemaVersion === 1 && isRecord(value.data)
  );
}

export function migrateLegacyFinanceStorage(
  legacy: LegacyFinanceStorageData
): PersistedFinanceDataV1 {
  return {
    schemaVersion: CURRENT_FINANCE_SCHEMA_VERSION,
    data: {
      monthlyBudget: normalizeMonthlyBudget(legacy.monthlyBudget),
      salaryDay: normalizeSalaryDay(legacy.salaryDay),
      currency: normalizeCurrency(legacy.currency),
      fixedExpenses: normalizeArray<FixedExpense>(legacy.fixedExpenses),
      recentExpenses: normalizeArray<Expense>(legacy.recentExpenses),
      trackingStartedAt: normalizeTrackingStartedAt(legacy.trackingStartedAt),
      expenseCategories: normalizeExpenseCategories(legacy.expenseCategories),
    },
  };
}

export function migrateFinanceStorage(raw: unknown): PersistedFinanceDataV1 {
  if (isPersistedFinanceDataV1(raw)) {
    return raw;
  }

  if (isRecord(raw)) {
    return migrateLegacyFinanceStorage(raw);
  }

  return createDefaultPersistedFinanceData();
}