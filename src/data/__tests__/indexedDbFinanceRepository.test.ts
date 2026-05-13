import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { financeIndexedDb } from "@/data/indexedDbFinanceDatabase";
import { indexedDbFinanceRepository } from "@/data/indexedDbFinanceRepository";
import type { PersistedFinanceState } from "@/data/financeRepository";

const testState: PersistedFinanceState = {
  monthlyBudget: 950,
  salaryDay: 10,
  currency: "BYN",
  fixedExpenses: [
    {
      id: "fixed-1",
      name: "Коммуналка",
      amount: 117,
    },
  ],
  recentExpenses: [
    {
      id: "expense-1",
      amount: 110,
      category: "fuel",
      createdAt: "2026-04-21T21:00:00.000Z",
    },
  ],
  trackingStartedAt: "2026-04-21T21:00:00.000Z",
  configuredCurrentCycleStartDate: "2026-04-10T21:00:00.000Z",
  configuredNextSalaryDate: "2026-05-10T21:00:00.000Z",
  periodBudgetSnapshots: [],
  expenseCategories: [
    {
      id: "food",
      name: "Еда",
      system: true,
    },
  ],
};

describe("indexedDbFinanceRepository", () => {
  beforeEach(async () => {
    await financeIndexedDb.delete();
    await financeIndexedDb.open();
  });

  it("returns null when IndexedDB has no existing data", async () => {
    const state = await indexedDbFinanceRepository.loadExisting();

    expect(state).toBeNull();
  });

  it("returns fallback state when load is called and IndexedDB has no data", async () => {
    const state = await indexedDbFinanceRepository.load();

    expect(state.monthlyBudget).toBe(0);
    expect(state.salaryDay).toBe(25);
    expect(state.currency).toBe("BYN");
    expect(state.fixedExpenses).toEqual([]);
    expect(state.recentExpenses).toEqual([]);
    expect(state.expenseCategories.length).toBeGreaterThan(0);
    expect(state.periodBudgetSnapshots).toEqual([]);
  });

  it("saves and loads finance state", async () => {
    await indexedDbFinanceRepository.save(testState);

    const loaded = await indexedDbFinanceRepository.load();

    expect(loaded.monthlyBudget).toBe(950);
    expect(loaded.salaryDay).toBe(10);
    expect(loaded.currency).toBe("BYN");
    expect(loaded.fixedExpenses).toEqual(testState.fixedExpenses);
    expect(loaded.recentExpenses).toEqual(testState.recentExpenses);
    expect(loaded.trackingStartedAt).toBe(testState.trackingStartedAt);
    expect(loaded.configuredCurrentCycleStartDate).toBe(
      testState.configuredCurrentCycleStartDate,
    );
    expect(loaded.configuredNextSalaryDate).toBe(
      testState.configuredNextSalaryDate,
    );
    expect(loaded.periodBudgetSnapshots).toEqual(
      testState.periodBudgetSnapshots,
    );
  });

  it("detects whether IndexedDB has finance data", async () => {
    expect(await indexedDbFinanceRepository.hasData()).toBe(false);

    await indexedDbFinanceRepository.save(testState);

    expect(await indexedDbFinanceRepository.hasData()).toBe(true);
  });

  it("clears finance data", async () => {
    await indexedDbFinanceRepository.save(testState);
    expect(await indexedDbFinanceRepository.hasData()).toBe(true);

    await indexedDbFinanceRepository.clear();

    expect(await indexedDbFinanceRepository.hasData()).toBe(false);
  });
});
