import { startOfDay } from "@/lib/finance";
import { normalizeExpenseCategories } from "@/domain/categoryUtils";
import {
  DEFAULT_CURRENCY,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_MONTHLY_BUDGET,
  DEFAULT_SALARY_DAY,
} from "@/domain/financeDefaults";
import { migrateFinanceStorage } from "@/data/financeStorageMigrations";
import {
  FINANCE_STORAGE_BACKUP_KEY,
  FINANCE_STORAGE_KEY,
  type PersistedFinanceDataV1,
} from "@/data/financeStorageTypes";
import type {
  FinanceRepository,
  PersistedFinanceState,
} from "@/data/financeRepository";

function startOfToday() {
  return startOfDay(new Date());
}

function createFallbackFinanceState(): PersistedFinanceState {
  return {
    monthlyBudget: DEFAULT_MONTHLY_BUDGET,
    salaryDay: DEFAULT_SALARY_DAY,
    currency: DEFAULT_CURRENCY,
    fixedExpenses: [],
    recentExpenses: [],
    trackingStartedAt: startOfToday().toISOString(),
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
  };
}

function toPersistedFinanceDataV1(
  data: PersistedFinanceState
): PersistedFinanceDataV1 {
  return {
    schemaVersion: 1,
    data,
  };
}

function backupLegacyStorageIfNeeded(raw: string) {
  if (typeof window === "undefined") return;

  const existingBackup = localStorage.getItem(FINANCE_STORAGE_BACKUP_KEY);

  if (!existingBackup) {
    localStorage.setItem(FINANCE_STORAGE_BACKUP_KEY, raw);
  }
}

export const localStorageFinanceRepository: FinanceRepository = {
  load() {
    const fallback = createFallbackFinanceState();

    if (typeof window === "undefined") return fallback;

    const raw = localStorage.getItem(FINANCE_STORAGE_KEY);

    if (!raw) return fallback;

    try {
      const parsed = JSON.parse(raw);
      const migrated = migrateFinanceStorage(parsed);

      if (!("schemaVersion" in parsed)) {
        backupLegacyStorageIfNeeded(raw);
        localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(migrated));
      }

      return {
        ...migrated.data,
        expenseCategories: normalizeExpenseCategories(
          migrated.data.expenseCategories
        ),
      };
    } catch {
      backupLegacyStorageIfNeeded(raw);
      return fallback;
    }
  },

  save(data) {
    if (typeof window === "undefined") return;

    localStorage.setItem(
      FINANCE_STORAGE_KEY,
      JSON.stringify(toPersistedFinanceDataV1(data))
    );
  },
};