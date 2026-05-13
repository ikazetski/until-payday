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
  getMaxDate,
  getNextSalaryDateFrom,
  getPreviousSalaryDateFrom,
  startOfDay,
} from "@/lib/finance";
import {
  CURRENT_FINANCE_SCHEMA_VERSION,
  type LegacyFinanceStorageData,
  type PersistedFinanceDataV1,
  type PersistedFinanceDataV2,
  type PersistedFinanceDataV3,
} from "@/data/financeStorageTypes";

import type { PeriodBudgetSnapshot } from "@/data/financeRepository";

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

function normalizeIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function normalizeConfiguredNextSalaryDate(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function normalizeConfiguredCurrentCycleStartDate(
  value: unknown,
): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? undefined
    : startOfDay(parsed).toISOString();
}

function inferCurrentCycleStartDate(
  salaryDay: number,
  trackingStartedAt: string,
): string {
  const previousSalaryDate = getPreviousSalaryDateFrom(new Date(), salaryDay);
  const trackingStart = startOfDay(new Date(trackingStartedAt));

  if (Number.isNaN(trackingStart.getTime())) {
    return previousSalaryDate.toISOString();
  }

  return getMaxDate(previousSalaryDate, trackingStart).toISOString();
}

function inferNextSalaryDate(salaryDay: number): string {
  return getNextSalaryDateFrom(new Date(), salaryDay).toISOString();
}

function normalizePeriodBudgetSnapshots(
  value: unknown,
): PeriodBudgetSnapshot[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item)) return null;

      const cycleStartDate = normalizeIsoDate(item.cycleStartDate);
      const nextSalaryDate = normalizeIsoDate(item.nextSalaryDate);

      if (!cycleStartDate || !nextSalaryDate) return null;

      return {
        cycleStartDate,
        nextSalaryDate,
        monthlyBudget: normalizeMonthlyBudget(item.monthlyBudget),
        currency: normalizeCurrency(item.currency),
        createdAt: normalizeIsoDate(item.createdAt) ?? new Date().toISOString(),
      };
    })
    .filter((item): item is PeriodBudgetSnapshot => item !== null);
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeLegacyExpenseCategories(
  value: unknown,
): ExpenseCategoryItem[] {
  const categories = normalizeArray<ExpenseCategoryItem>(value);

  return normalizeExpenseCategories(
    categories.length > 0 ? categories : DEFAULT_EXPENSE_CATEGORIES,
  );
}

function getCategoryNameById(
  categories: Array<{ id: string; name: string }>,
  categoryId: string,
) {
  return (
    categories.find((category) => category.id === categoryId)?.name ?? "Другое"
  );
}

function addCategorySnapshotsToExpenses(
  expenses: Expense[],
  categories: ExpenseCategoryItem[],
): Expense[] {
  return expenses.map((expense) => ({
    ...expense,
    categoryNameSnapshot:
      expense.categoryNameSnapshot ??
      getCategoryNameById(categories, expense.category),
  }));
}

export function createDefaultPersistedFinanceData(): PersistedFinanceDataV3 {
  const expenseCategories = normalizeExpenseCategories(
    DEFAULT_EXPENSE_CATEGORIES,
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
      configuredCurrentCycleStartDate: inferCurrentCycleStartDate(
        DEFAULT_SALARY_DAY,
        new Date().toISOString(),
      ),
      configuredNextSalaryDate: inferNextSalaryDate(DEFAULT_SALARY_DAY),
      periodBudgetSnapshots: [],
      expenseCategories,
    },
  };
}

export function isPersistedFinanceDataV1(
  value: unknown,
): value is PersistedFinanceDataV1 {
  return isRecord(value) && value.schemaVersion === 1 && isRecord(value.data);
}

export function isPersistedFinanceDataV2(
  value: unknown,
): value is PersistedFinanceDataV2 {
  return isRecord(value) && value.schemaVersion === 2 && isRecord(value.data);
}

export function isPersistedFinanceDataV3(
  value: unknown,
): value is PersistedFinanceDataV3 {
  return isRecord(value) && value.schemaVersion === 3 && isRecord(value.data);
}

export function migrateLegacyFinanceStorage(
  legacy: LegacyFinanceStorageData,
): PersistedFinanceDataV1 {
  return {
    schemaVersion: 1,
    data: {
      monthlyBudget: normalizeMonthlyBudget(legacy.monthlyBudget),
      salaryDay: normalizeSalaryDay(legacy.salaryDay),
      currency: normalizeCurrency(legacy.currency),
      fixedExpenses: normalizeArray<FixedExpense>(legacy.fixedExpenses),
      recentExpenses: normalizeArray<Expense>(legacy.recentExpenses),
      configuredCurrentCycleStartDate:
        normalizeConfiguredCurrentCycleStartDate(
          legacy.configuredCurrentCycleStartDate,
        ) ??
        inferCurrentCycleStartDate(
          normalizeSalaryDay(legacy.salaryDay),
          normalizeTrackingStartedAt(legacy.trackingStartedAt),
        ),
      trackingStartedAt: normalizeTrackingStartedAt(legacy.trackingStartedAt),
      configuredNextSalaryDate: normalizeConfiguredNextSalaryDate(
        legacy.configuredNextSalaryDate,
      ),
      periodBudgetSnapshots: normalizePeriodBudgetSnapshots(
        legacy.periodBudgetSnapshots,
      ),
      expenseCategories: normalizeLegacyExpenseCategories(
        legacy.expenseCategories,
      ),
    },
  };
}

function migrateV1ToV2(data: PersistedFinanceDataV1): PersistedFinanceDataV2 {
  const expenseCategories = normalizeExpenseCategories(
    data.data.expenseCategories,
  );

  return {
    schemaVersion: 2,
    data: {
      ...data.data,
      expenseCategories,
      recentExpenses: addCategorySnapshotsToExpenses(
        data.data.recentExpenses,
        expenseCategories,
      ),
    },
  };
}

function migrateV2ToV3(data: PersistedFinanceDataV2): PersistedFinanceDataV3 {
  return {
    schemaVersion: 3,
    data: {
      ...data.data,
      configuredCurrentCycleStartDate:
        normalizeConfiguredCurrentCycleStartDate(
          data.data.configuredCurrentCycleStartDate,
        ) ??
        inferCurrentCycleStartDate(
          data.data.salaryDay,
          data.data.trackingStartedAt,
        ),
      configuredNextSalaryDate:
        normalizeConfiguredNextSalaryDate(data.data.configuredNextSalaryDate) ??
        inferNextSalaryDate(data.data.salaryDay),
      periodBudgetSnapshots: normalizePeriodBudgetSnapshots(
        data.data.periodBudgetSnapshots,
      ),
    },
  };
}

function normalizePersistedV3Data(
  data: PersistedFinanceDataV3,
): PersistedFinanceDataV3 {
  const expenseCategories = normalizeExpenseCategories(
    data.data.expenseCategories,
  );

  return {
    schemaVersion: 3,
    data: {
      ...data.data,
      configuredCurrentCycleStartDate:
        normalizeConfiguredCurrentCycleStartDate(
          data.data.configuredCurrentCycleStartDate,
        ) ??
        inferCurrentCycleStartDate(
          data.data.salaryDay,
          data.data.trackingStartedAt,
        ),
      configuredNextSalaryDate:
        normalizeConfiguredNextSalaryDate(data.data.configuredNextSalaryDate) ??
        inferNextSalaryDate(data.data.salaryDay),
      periodBudgetSnapshots: normalizePeriodBudgetSnapshots(
        data.data.periodBudgetSnapshots,
      ),
      expenseCategories,
      recentExpenses: addCategorySnapshotsToExpenses(
        data.data.recentExpenses,
        expenseCategories,
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
        fixedExpenses: normalizeArray<FixedExpense>(value.data.fixedExpenses),
        recentExpenses: normalizeArray<Expense>(value.data.recentExpenses),
        trackingStartedAt: normalizeTrackingStartedAt(
          value.data.trackingStartedAt,
        ),
        configuredCurrentCycleStartDate:
          normalizeConfiguredCurrentCycleStartDate(
            value.data.configuredCurrentCycleStartDate,
          ) ??
          inferCurrentCycleStartDate(
            normalizeSalaryDay(value.data.salaryDay),
            normalizeTrackingStartedAt(value.data.trackingStartedAt),
          ),
        configuredNextSalaryDate: normalizeConfiguredNextSalaryDate(
          value.data.configuredNextSalaryDate,
        ),
        periodBudgetSnapshots: normalizePeriodBudgetSnapshots(
          value.data.periodBudgetSnapshots,
        ),
        expenseCategories: normalizeLegacyExpenseCategories(
          value.data.expenseCategories,
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

export function migrateFinanceStorage(value: unknown): PersistedFinanceDataV3 {
  if (isPersistedFinanceDataV3(value)) {
    return normalizePersistedV3Data(value);
  }

  if (isPersistedFinanceDataV2(value)) {
    return migrateV2ToV3(value);
  }

  const v1 = migrateToV1(value);
  const v2 = migrateV1ToV2(v1);

  return migrateV2ToV3(v2);
}
