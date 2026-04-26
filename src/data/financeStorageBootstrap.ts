import type { PersistedFinanceState } from "@/data/financeRepository";
import { createFallbackFinanceState } from "@/data/financeStateFactory";
import { indexedDbFinanceRepository } from "@/data/indexedDbFinanceRepository";
import { localStorageFinanceRepository } from "@/data/localStorageFinanceRepository";
import { requestPersistentStorage } from "@/data/browserStorageHealth";

export type FinanceStorageSource = "indexedDB" | "localStorage" | "fallback";

export type FinanceStorageBootstrapResult = {
  state: PersistedFinanceState;
  source: FinanceStorageSource;
  persistentStorageGranted: boolean;
};

export async function bootstrapFinanceStorage(): Promise<FinanceStorageBootstrapResult> {
  const persistentStorageGranted = await requestPersistentStorage();

  const indexedDbState = await indexedDbFinanceRepository.loadExisting();

  if (indexedDbState) {
    localStorageFinanceRepository.save(indexedDbState);

    return {
      state: indexedDbState,
      source: "indexedDB",
      persistentStorageGranted,
    };
  }

  const localStorageState = localStorageFinanceRepository.loadExisting();

  if (localStorageState) {
    await indexedDbFinanceRepository.save(localStorageState);
    localStorageFinanceRepository.save(localStorageState);

    return {
      state: localStorageState,
      source: "localStorage",
      persistentStorageGranted,
    };
  }

  return {
    state: createFallbackFinanceState(),
    source: "fallback",
    persistentStorageGranted,
  };
}

export function persistFinanceState(data: PersistedFinanceState): void {
  localStorageFinanceRepository.save(data);

  void indexedDbFinanceRepository.save(data).catch((error) => {
    console.error("Failed to save finance state to IndexedDB", error);
  });
}