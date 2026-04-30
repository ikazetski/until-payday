import { normalizeExpenseCategories } from "@/domain/categoryUtils";
import { createFallbackFinanceState } from "@/data/financeStateFactory";
import { migrateFinanceStorage } from "@/data/financeStorageMigrations";
import {
  FINANCE_STORAGE_BACKUP_KEY,
  FINANCE_STORAGE_KEY,
  type PersistedFinanceDataV2,
} from "@/data/financeStorageTypes";
import type {
  FinanceRepository,
  PersistedFinanceState,
} from "@/data/financeRepository";

type LocalStorageFinanceRepository = FinanceRepository & {
  loadExisting: () => PersistedFinanceState | null;
};

function toPersistedFinanceDataV2(
  data: PersistedFinanceState
): PersistedFinanceDataV2 {
  return {
    schemaVersion: 2,
    data,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasSchemaVersion(value: unknown): boolean {
  return isRecord(value) && "schemaVersion" in value;
}

function backupLegacyStorageIfNeeded(raw: string) {
  if (typeof window === "undefined") return;

  const existingBackup = localStorage.getItem(FINANCE_STORAGE_BACKUP_KEY);

  if (!existingBackup) {
    localStorage.setItem(FINANCE_STORAGE_BACKUP_KEY, raw);
  }
}

function normalizeFinanceState(
  state: PersistedFinanceState
): PersistedFinanceState {
  return {
    ...state,
    expenseCategories: normalizeExpenseCategories(state.expenseCategories),
  };
}

function readExistingFinanceState(): PersistedFinanceState | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(FINANCE_STORAGE_KEY);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const migrated = migrateFinanceStorage(parsed);

    if (!hasSchemaVersion(parsed)) {
      backupLegacyStorageIfNeeded(raw);
      localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(migrated));
    }

    return normalizeFinanceState(migrated.data);
  } catch {
    backupLegacyStorageIfNeeded(raw);
    return null;
  }
}

export const localStorageFinanceRepository: LocalStorageFinanceRepository = {
  load() {
    return readExistingFinanceState() ?? createFallbackFinanceState();
  },

  loadExisting() {
    return readExistingFinanceState();
  },

  save(data) {
    if (typeof window === "undefined") return;

    localStorage.setItem(
      FINANCE_STORAGE_KEY,
      JSON.stringify(toPersistedFinanceDataV2(normalizeFinanceState(data)))
    );
  },
};