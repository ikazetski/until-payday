import { describe, expect, it } from "vitest";
import {
  createDefaultPersistedFinanceData,
  migrateFinanceStorage,
} from "@/data/financeStorageMigrations";

describe("financeStorageMigrations", () => {
  it("migrates legacy storage without schemaVersion to v1", () => {
    const legacy = {
      monthlyBudget: 1000,
      salaryDay: 25,
      currency: "BYN",
      fixedExpenses: [{ id: "fixed-1", name: "Internet", amount: 50 }],
      recentExpenses: [
        {
          id: "expense-1",
          amount: 20,
          category: "food",
          createdAt: "2026-04-15T10:00:00.000Z",
        },
      ],
      trackingStartedAt: "2026-03-25T00:00:00.000Z",
      expenseCategories: [
        {
          id: "food",
          name: "Еда",
          color: "#000000",
        },
      ],
    };

    const migrated = migrateFinanceStorage(legacy);

    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.data.monthlyBudget).toBe(1000);
    expect(migrated.data.salaryDay).toBe(25);
    expect(migrated.data.currency).toBe("BYN");
    expect(migrated.data.fixedExpenses).toEqual(legacy.fixedExpenses);
    expect(migrated.data.recentExpenses).toEqual(legacy.recentExpenses);
    expect(migrated.data.trackingStartedAt).toBe(
      "2026-03-25T00:00:00.000Z"
    );
    expect(migrated.data.expenseCategories).toEqual(legacy.expenseCategories);
  });

  it("keeps valid v1 storage unchanged", () => {
    const v1 = {
      schemaVersion: 1 as const,
      data: {
        monthlyBudget: 800,
        salaryDay: 20,
        currency: "EUR" as const,
        fixedExpenses: [],
        recentExpenses: [],
        trackingStartedAt: "2026-04-01T00:00:00.000Z",
        expenseCategories: [],
      },
    };

    const migrated = migrateFinanceStorage(v1);

    expect(migrated).toEqual(v1);
  });

  it("falls back to defaults when storage is invalid", () => {
    const migrated = migrateFinanceStorage(null);

    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.data.monthlyBudget).toBe(0);
    expect(migrated.data.salaryDay).toBe(25);
    expect(migrated.data.currency).toBe("BYN");
    expect(migrated.data.fixedExpenses).toEqual([]);
    expect(migrated.data.recentExpenses).toEqual([]);
    expect(migrated.data.expenseCategories).toEqual([]);
    expect(typeof migrated.data.trackingStartedAt).toBe("string");
  });

  it("normalizes invalid legacy values safely", () => {
    const migrated = migrateFinanceStorage({
      monthlyBudget: -100,
      salaryDay: 99,
      currency: "INVALID",
      fixedExpenses: "not-array",
      recentExpenses: "not-array",
      trackingStartedAt: "",
      expenseCategories: "not-array",
    });

    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.data.monthlyBudget).toBe(0);
    expect(migrated.data.salaryDay).toBe(25);
    expect(migrated.data.currency).toBe("BYN");
    expect(migrated.data.fixedExpenses).toEqual([]);
    expect(migrated.data.recentExpenses).toEqual([]);
    expect(migrated.data.expenseCategories).toEqual([]);
    expect(typeof migrated.data.trackingStartedAt).toBe("string");
  });

  it("creates default persisted finance data", () => {
    const data = createDefaultPersistedFinanceData();

    expect(data.schemaVersion).toBe(1);
    expect(data.data.monthlyBudget).toBe(0);
    expect(data.data.salaryDay).toBe(25);
    expect(data.data.currency).toBe("BYN");
  });
});