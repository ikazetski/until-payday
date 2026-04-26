import Dexie, { type Table } from "dexie";
import type { PersistedFinanceState } from "@/data/financeRepository";

export const FINANCE_INDEXED_DB_NAME = "until-payday-db";

export type FinanceStateRecord = {
  id: "current";
  state: PersistedFinanceState;
  updatedAt: string;
};

class FinanceIndexedDb extends Dexie {
  financeState!: Table<FinanceStateRecord, string>;

  constructor() {
    super(FINANCE_INDEXED_DB_NAME);

    this.version(1).stores({
      financeState: "id, updatedAt",
    });
  }
}

export const financeIndexedDb = new FinanceIndexedDb();