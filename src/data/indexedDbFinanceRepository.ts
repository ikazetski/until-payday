import { normalizeExpenseCategories } from "@/domain/categoryUtils";
import { createFallbackFinanceState } from "@/data/financeStateFactory";
import type {
  AsyncFinanceRepository,
  PersistedFinanceState,
} from "@/data/financeRepository";
import { financeIndexedDb } from "@/data/indexedDbFinanceDatabase";

type IndexedDbFinanceRepository = AsyncFinanceRepository & {
  loadExisting: () => Promise<PersistedFinanceState | null>;
  hasData: () => Promise<boolean>;
  clear: () => Promise<void>;
};

function normalizeFinanceState(
  state: PersistedFinanceState
): PersistedFinanceState {
  return {
    ...state,
    expenseCategories: normalizeExpenseCategories(state.expenseCategories),
  };
}

export const indexedDbFinanceRepository: IndexedDbFinanceRepository = {
  async load(): Promise<PersistedFinanceState> {
    return (await this.loadExisting()) ?? createFallbackFinanceState();
  },

  async loadExisting(): Promise<PersistedFinanceState | null> {
    const record = await financeIndexedDb.financeState.get("current");

    if (!record) {
      return null;
    }

    return normalizeFinanceState(record.state);
  },

  async save(data: PersistedFinanceState): Promise<void> {
    await financeIndexedDb.financeState.put({
      id: "current",
      state: normalizeFinanceState(data),
      updatedAt: new Date().toISOString(),
    });
  },

  async hasData(): Promise<boolean> {
    const record = await financeIndexedDb.financeState.get("current");
    return Boolean(record);
  },

  async clear(): Promise<void> {
    await financeIndexedDb.financeState.clear();
  },
};