import type { PersistedFinanceState } from "@/data/financeRepository";

export const FINANCE_STORAGE_KEY = "until-payday-finance";
export const FINANCE_STORAGE_BACKUP_KEY =
  "until-payday-finance-backup-before-v1";

export const CURRENT_FINANCE_SCHEMA_VERSION = 2;

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
  data: PersistedFinanceState;
};

export type PersistedFinanceDataV2 = {
  schemaVersion: 2;
  data: PersistedFinanceState;
};

export type PersistedFinanceData =
  | PersistedFinanceDataV1
  | PersistedFinanceDataV2;