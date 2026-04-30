import { describe, expect, it } from "vitest";
import {
  createDefaultPersistedFinanceData,
  migrateFinanceStorage,
} from "@/data/financeStorageMigrations";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/domain/financeDefaults";

describe("financeStorageMigrations", () => {
  it("migrates legacy storage without schemaVersion to v2", () => {
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

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.data.monthlyBudget).toBe(1000);
    expect(migrated.data.salaryDay).toBe(25);
    expect(migrated.data.currency).toBe("BYN");
    expect(migrated.data.fixedExpenses).toEqual(legacy.fixedExpenses);
    expect(migrated.data.recentExpenses).toEqual([
      {
        ...legacy.recentExpenses[0],
        categoryNameSnapshot: "Еда",
      },
    ]);
    expect(migrated.data.trackingStartedAt).toBe("2026-03-25T00:00:00.000Z");

    expect(migrated.data.expenseCategories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "food",
          name: "Еда",
          hidden: false,
          order: 0,
          system: true,
        }),
        expect.objectContaining({
          id: "other",
          name: "Другое",
          hidden: false,
          system: true,
        }),
      ]),
    );

    expect(migrated.data.expenseCategories.length).toBeGreaterThanOrEqual(
      DEFAULT_EXPENSE_CATEGORIES.length,
    );
  });

  it("migrates valid v1 storage to v2", () => {
    const v1 = {
      schemaVersion: 1,
      data: {
        monthlyBudget: 800,
        salaryDay: 20,
        currency: "EUR",
        fixedExpenses: [],
        recentExpenses: [],
        trackingStartedAt: "2026-04-01T00:00:00.000Z",
        expenseCategories: [],
      },
    } as const;

    const migrated = migrateFinanceStorage(v1);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.data.monthlyBudget).toBe(800);
    expect(migrated.data.salaryDay).toBe(20);
    expect(migrated.data.currency).toBe("EUR");
    expect(migrated.data.fixedExpenses).toEqual([]);
    expect(migrated.data.recentExpenses).toEqual([]);
    expect(migrated.data.trackingStartedAt).toBe("2026-04-01T00:00:00.000Z");

    expect(migrated.data.expenseCategories.length).toBeGreaterThan(0);
    expect(migrated.data.expenseCategories[0].hidden).toBe(false);
    expect(migrated.data.expenseCategories[0].order).toBe(0);
    expect(migrated.data.expenseCategories[0]).toEqual(
      expect.objectContaining({
        hidden: false,
        order: expect.any(Number),
      }),
    );
  });

  it("falls back to defaults when storage is invalid", () => {
    const migrated = migrateFinanceStorage(null);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.data.monthlyBudget).toBe(0);
    expect(migrated.data.salaryDay).toBe(25);
    expect(migrated.data.currency).toBe("BYN");
    expect(migrated.data.fixedExpenses).toEqual([]);
    expect(migrated.data.recentExpenses).toEqual([]);
    expect(migrated.data.expenseCategories).toEqual(
      DEFAULT_EXPENSE_CATEGORIES.map((category, index) => ({
        ...category,
        hidden: false,
        order: index,
      })),
    );
    expect(typeof migrated.data.trackingStartedAt).toBe("string");
    expect(migrated.data.expenseCategories.length).toBeGreaterThan(0);
    expect(migrated.data.expenseCategories[0].hidden).toBe(false);
    expect(migrated.data.expenseCategories[0].order).toBe(0);
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

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.data.monthlyBudget).toBe(0);
    expect(migrated.data.salaryDay).toBe(25);
    expect(migrated.data.currency).toBe("BYN");
    expect(migrated.data.fixedExpenses).toEqual([]);
    expect(migrated.data.recentExpenses).toEqual([]);
    expect(migrated.data.expenseCategories.length).toBeGreaterThan(0);
    expect(migrated.data.expenseCategories[0].hidden).toBe(false);
    expect(migrated.data.expenseCategories[0].order).toBe(0);
    expect(migrated.data.expenseCategories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "food",
          system: true,
        }),
        expect.objectContaining({
          id: "other",
          system: true,
        }),
      ]),
    );
    expect(typeof migrated.data.trackingStartedAt).toBe("string");
  });

  it("migrates v1 expenses with category name snapshots", () => {
    const migrated = migrateFinanceStorage({
      schemaVersion: 1,
      data: {
        monthlyBudget: 1000,
        salaryDay: 10,
        currency: "BYN",
        fixedExpenses: [],
        recentExpenses: [
          {
            id: "expense-1",
            amount: 120,
            category: "custom_clothes",
            createdAt: "2026-04-10T10:00:00.000Z",
          },
        ],
        trackingStartedAt: "2026-04-10T00:00:00.000Z",
        expenseCategories: [
          {
            id: "custom_clothes",
            name: "Одежда",
            system: false,
          },
        ],
      },
    });

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.data.expenseCategories.length).toBeGreaterThan(0);
    expect(migrated.data.expenseCategories[0].hidden).toBe(false);
    expect(migrated.data.expenseCategories[0].order).toBe(0);
    expect(migrated.data.recentExpenses[0].categoryNameSnapshot).toBe("Одежда");
  });

  it("migrates v1 categories with hidden and order defaults", () => {
    const migrated = migrateFinanceStorage({
      schemaVersion: 1,
      data: {
        monthlyBudget: 1000,
        salaryDay: 10,
        currency: "BYN",
        fixedExpenses: [],
        recentExpenses: [],
        trackingStartedAt: "2026-04-10T00:00:00.000Z",
        expenseCategories: [
          {
            id: "food",
            name: "Еда",
            system: true,
          },
          {
            id: "custom_clothes",
            name: "Одежда",
            system: false,
          },
        ],
      },
    });

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.data.expenseCategories[0].hidden).toBe(false);
    expect(migrated.data.expenseCategories[0].order).toBe(0);
    expect(migrated.data.expenseCategories[1].hidden).toBe(false);
    expect(migrated.data.expenseCategories[1].order).toBe(1);
  });

  it("creates default persisted finance data", () => {
    const data = createDefaultPersistedFinanceData();

    expect(data.schemaVersion).toBe(2);
    expect(data.data.monthlyBudget).toBe(0);
    expect(data.data.salaryDay).toBe(25);
    expect(data.data.currency).toBe("BYN");
    expect(data.data.fixedExpenses).toEqual([]);
    expect(data.data.recentExpenses).toEqual([]);
    expect(data.data.expenseCategories).toEqual(
      DEFAULT_EXPENSE_CATEGORIES.map((category, index) => ({
        ...category,
        hidden: false,
        order: index,
      })),
    );
    expect(typeof data.data.trackingStartedAt).toBe("string");
  });
});
