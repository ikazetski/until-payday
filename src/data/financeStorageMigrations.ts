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
import { normalizeExpenseCategories } from "@/domain/categoryUtils";
import {
  CURRENT_FINANCE_SCHEMA_VERSION,
  type LegacyFinanceStorageData,
  type PersistedFinanceDataV1,
  type PersistedFinanceDataV2,
} from "@/data/financeStorageTypes";

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

function normalizeLegacyExpenseCategories(
  value: unknown
): ExpenseCategoryItem[] {
  const categories = normalizeArray<ExpenseCategoryItem>(value);

  return normalizeExpenseCategories(
    categories.length > 0 ? categories : DEFAULT_EXPENSE_CATEGORIES
  );
}

function getCategoryNameById(
  categories: Array<{ id: string; name: string }>,
  categoryId: string
) {
  return (
    categories.find((category) => category.id === categoryId)?.name ?? "Другое"
  );
}

function addCategorySnapshotsToExpenses(
  expenses: Expense[],
  categories: ExpenseCategoryItem[]
): Expense[] {
  return expenses.map((expense) => ({
    ...expense,
    categoryNameSnapshot:
      expense.categoryNameSnapshot ??
      getCategoryNameById(categories, expense.category),
  }));
}

export function createDefaultPersistedFinanceData(): PersistedFinanceDataV2 {
  const expenseCategories = normalizeExpenseCategories(
    DEFAULT_EXPENSE_CATEGORIES
  );

  return {
    schemaVersion: CURRENT_FINANCE_SCHEMA_VERSION,
    data: {
      monthlyBudget: DEFAULT_MONTHLY_BUDGET,
      salaryDay: DEFAULT_SALARY_DAY,
      currency: DEFAULT_CURRENCY,
      fixedExpenses: [],
      recentExpenses: [],
      trackingStartedAt: new Date().toISOString(),
      expenseCategories,
    },
  };
}

export function isPersistedFinanceDataV1(
  value: unknown
): value is PersistedFinanceDataV1 {
  return isRecord(value) && value.schemaVersion === 1 && isRecord(value.data);
}

export function isPersistedFinanceDataV2(
  value: unknown
): value is PersistedFinanceDataV2 {
  return isRecord(value) && value.schemaVersion === 2 && isRecord(value.data);
}

export function migrateLegacyFinanceStorage(
  legacy: LegacyFinanceStorageData
): PersistedFinanceDataV1 {
  return {
    schemaVersion: 1,
    data: {
      monthlyBudget: normalizeMonthlyBudget(legacy.monthlyBudget),
      salaryDay: normalizeSalaryDay(legacy.salaryDay),
      currency: normalizeCurrency(legacy.currency),
      fixedExpenses: normalizeArray<FixedExpense>(legacy.fixedExpenses),
      recentExpenses: normalizeArray<Expense>(legacy.recentExpenses),
      trackingStartedAt: normalizeTrackingStartedAt(legacy.trackingStartedAt),
      expenseCategories: normalizeLegacyExpenseCategories(
        legacy.expenseCategories
      ),
    },
  };
}

function migrateV1ToV2(data: PersistedFinanceDataV1): PersistedFinanceDataV2 {
  const expenseCategories = normalizeExpenseCategories(
    data.data.expenseCategories
  );

  return {
    schemaVersion: 2,
    data: {
      ...data.data,
      expenseCategories,
      recentExpenses: addCategorySnapshotsToExpenses(
        data.data.recentExpenses,
        expenseCategories
      ),
    },
  };
}

function normalizePersistedV2Data(
  data: PersistedFinanceDataV2
): PersistedFinanceDataV2 {
  const expenseCategories = normalizeExpenseCategories(
    data.data.expenseCategories
  );

  return {
    schemaVersion: 2,
    data: {
      ...data.data,
      expenseCategories,
      recentExpenses: addCategorySnapshotsToExpenses(
        data.data.recentExpenses,
        expenseCategories
      ),
    },
  };
}

function migrateToV1(value: unknown): PersistedFinanceDataV1 {
  if (isPersistedFinanceDataV1(value)) {
    return {
      schemaVersion: 1,
      data: {
        monthlyBudget: normalizeMonthlyBudget(value.data.monthlyBudget),
        salaryDay: normalizeSalaryDay(value.data.salaryDay),
        currency: normalizeCurrency(value.data.currency),
        fixedExpenses: normalizeArray<FixedExpense>(
          value.data.fixedExpenses
        ),
        recentExpenses: normalizeArray<Expense>(value.data.recentExpenses),
        trackingStartedAt: normalizeTrackingStartedAt(
          value.data.trackingStartedAt
        ),
        expenseCategories: normalizeLegacyExpenseCategories(
          value.data.expenseCategories
        ),
      },
    };
  }

  if (isRecord(value)) {
    return migrateLegacyFinanceStorage(value as LegacyFinanceStorageData);
  }

  const fallback = createDefaultPersistedFinanceData();

  return {
    schemaVersion: 1,
    data: fallback.data,
  };
}

export function migrateFinanceStorage(value: unknown): PersistedFinanceDataV2 {
  if (isPersistedFinanceDataV2(value)) {
    return normalizePersistedV2Data(value);
  }

  const v1 = migrateToV1(value);

  return migrateV1ToV2(v1);
}