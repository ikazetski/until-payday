import { describe, expect, it } from "vitest";
import { calculateFinance } from "@/domain/financeEngine";
import type { Expense, FixedExpense } from "@/domain/financeTypes";

function createExpense(
  id: string,
  amount: number,
  createdAt: string,
  category = "food",
): Expense {
  return {
    id,
    amount,
    category,
    createdAt,
  };
}

describe("calculateFinance", () => {
  it("calculates period spent and remaining budget for current cycle expenses", () => {
    const expenses: Expense[] = [
      createExpense("1", 50, "2026-04-15T09:00:00.000Z"),
      createExpense("2", 20, "2026-04-14T09:00:00.000Z"),
    ];

    const fixedExpenses: FixedExpense[] = [];

    const result = calculateFinance({
      monthlyBudget: 1000,
      salaryDay: 25,
      currency: "BYN",
      fixedExpenses,
      recentExpenses: expenses,
      trackingStartedAt: "2026-03-25T00:00:00.000Z",
      now: new Date("2026-04-15T12:00:00.000Z"),
    });

    expect(result.totalSpentCore).toBe(70);
    expect(result.remaining).toBe(930);
  });

  it("ignores expenses outside of current salary cycle", () => {
    const expenses: Expense[] = [
      createExpense("1", 50, "2026-04-15T09:00:00.000Z"),
      createExpense("2", 999, "2026-03-20T09:00:00.000Z"),
    ];

    const result = calculateFinance({
      monthlyBudget: 1000,
      salaryDay: 25,
      currency: "BYN",
      fixedExpenses: [],
      recentExpenses: expenses,
      trackingStartedAt: "2026-03-25T00:00:00.000Z",
      now: new Date("2026-04-15T12:00:00.000Z"),
    });

    expect(result.totalSpentCore).toBe(50);
    expect(result.remaining).toBe(950);
  });

  it("calculates spent today only from today's expenses", () => {
    const expenses: Expense[] = [
      createExpense("1", 50, "2026-04-15T09:00:00.000Z"),
      createExpense("2", 20, "2026-04-14T09:00:00.000Z"),
    ];

    const result = calculateFinance({
      monthlyBudget: 1000,
      salaryDay: 25,
      currency: "BYN",
      fixedExpenses: [],
      recentExpenses: expenses,
      trackingStartedAt: "2026-03-25T00:00:00.000Z",
      now: new Date("2026-04-15T12:00:00.000Z"),
    });

    expect(result.spentToday).toBe(50);
  });

  it("calculates weekly spent only from expenses inside current week", () => {
    const expenses: Expense[] = [
      createExpense("1", 50, "2026-04-15T09:00:00.000Z"),
      createExpense("2", 20, "2026-04-14T09:00:00.000Z"),
      createExpense("3", 30, "2026-04-06T09:00:00.000Z"),
    ];

    const result = calculateFinance({
      monthlyBudget: 1000,
      salaryDay: 25,
      currency: "BYN",
      fixedExpenses: [],
      recentExpenses: expenses,
      trackingStartedAt: "2026-03-25T00:00:00.000Z",
      now: new Date("2026-04-15T12:00:00.000Z"),
    });

    expect(result.weeklySpent).toBe(70);
  });

  it("keeps fixed expenses as a separate total and does not include them into period spent", () => {
    const fixedExpenses: FixedExpense[] = [
      {
        id: "rent",
        name: "Rent",
        amount: 300,
      },
      {
        id: "internet",
        name: "Internet",
        amount: 50,
      },
    ];

    const result = calculateFinance({
      monthlyBudget: 1000,
      salaryDay: 25,
      currency: "BYN",
      fixedExpenses,
      recentExpenses: [],
      trackingStartedAt: "2026-03-25T00:00:00.000Z",
      now: new Date("2026-04-15T12:00:00.000Z"),
    });

    expect(result.fixedTotal).toBe(350);
    expect(result.totalSpentCore).toBe(0);
    expect(result.remaining).toBe(1000);
  });

  it("calculates current cycle boundaries based on salary day", () => {
    const result = calculateFinance({
      monthlyBudget: 1000,
      salaryDay: 25,
      currency: "BYN",
      fixedExpenses: [],
      recentExpenses: [],
      trackingStartedAt: "2026-03-25T00:00:00.000Z",
      now: new Date("2026-04-15T12:00:00.000Z"),
    });

    expect(result.currentCycleStart.toISOString()).toBe(
      new Date(2026, 2, 25).toISOString(),
    );
    expect(result.nextSalaryDate.toISOString()).toBe(
      new Date(2026, 3, 25).toISOString(),
    );
  });

  it("uses configured next salary date for a long salary cycle from May 8 to June 10", () => {
    const result = calculateFinance({
      monthlyBudget: 2700,
      salaryDay: 10,
      currency: "BYN",
      fixedExpenses: [],
      recentExpenses: [],
      trackingStartedAt: new Date(2026, 4, 8).toISOString(),
      configuredCurrentCycleStartDate: new Date(2026, 4, 8).toISOString(),
      configuredNextSalaryDate: new Date(2026, 5, 10).toISOString(),
      now: new Date(2026, 4, 8, 12),
    });

    expect(result.currentCycleStart.toISOString()).toBe(
      new Date(2026, 4, 8).toISOString(),
    );
    expect(result.nextSalaryDate.toISOString()).toBe(
      new Date(2026, 5, 10).toISOString(),
    );
  });

  it("supports a shorter configured salary cycle from June 10 to July 6", () => {
    const result = calculateFinance({
      monthlyBudget: 2700,
      salaryDay: 6,
      currency: "BYN",
      fixedExpenses: [],
      recentExpenses: [],
      trackingStartedAt: new Date(2026, 5, 10).toISOString(),
      configuredCurrentCycleStartDate: new Date(2026, 5, 10).toISOString(),
      configuredNextSalaryDate: new Date(2026, 6, 6).toISOString(),
      now: new Date(2026, 5, 10, 12),
    });

    expect(result.currentCycleStart.toISOString()).toBe(
      new Date(2026, 5, 10).toISOString(),
    );
    expect(result.nextSalaryDate.toISOString()).toBe(
      new Date(2026, 6, 6).toISOString(),
    );
  });

  it("does not mix expenses from the previous configured salary cycle", () => {
    const expenses: Expense[] = [
      createExpense("old", 1195.11, new Date(2026, 4, 7, 10).toISOString()),
      createExpense("new", 100, new Date(2026, 4, 8, 10).toISOString()),
    ];

    const result = calculateFinance({
      monthlyBudget: 2700,
      salaryDay: 10,
      currency: "BYN",
      fixedExpenses: [],
      recentExpenses: expenses,
      trackingStartedAt: new Date(2026, 4, 8).toISOString(),
      configuredCurrentCycleStartDate: new Date(2026, 4, 8).toISOString(),
      configuredNextSalaryDate: new Date(2026, 5, 10).toISOString(),
      now: new Date(2026, 4, 8, 12),
    });

    expect(result.totalSpentCore).toBe(100);
    expect(result.remaining).toBe(2600);
  });

  it("includes expenses from cycle start and excludes expenses before cycle start", () => {
    const expenses: Expense[] = [
      createExpense("before-cycle", 999, "2026-05-07T20:59:59.999Z"),
      createExpense(
        "cycle-start",
        100,
        new Date(2026, 4, 8, 0, 0, 0).toISOString(),
      ),
      createExpense(
        "inside-cycle",
        50,
        new Date(2026, 4, 9, 12, 0, 0).toISOString(),
      ),
    ];

    const result = calculateFinance({
      monthlyBudget: 2700,
      salaryDay: 10,
      currency: "BYN",
      fixedExpenses: [],
      recentExpenses: expenses,
      trackingStartedAt: new Date(2026, 4, 8).toISOString(),
      configuredCurrentCycleStartDate: new Date(2026, 4, 8).toISOString(),
      configuredNextSalaryDate: new Date(2026, 5, 10).toISOString(),
      now: new Date(2026, 4, 9, 12),
    });

    expect(result.totalSpentCore).toBe(150);
    expect(result.remaining).toBe(2550);
  });

  it("includes expenses before next salary date and excludes expenses on next salary date", () => {
    const expenses: Expense[] = [
      createExpense(
        "last-day",
        100,
        new Date(2026, 5, 9, 23, 59, 59).toISOString(),
      ),
      createExpense(
        "next-cycle",
        500,
        new Date(2026, 5, 10, 0, 0, 0).toISOString(),
      ),
    ];

    const result = calculateFinance({
      monthlyBudget: 2700,
      salaryDay: 10,
      currency: "BYN",
      fixedExpenses: [],
      recentExpenses: expenses,
      trackingStartedAt: new Date(2026, 4, 8).toISOString(),
      configuredNextSalaryDate: new Date(2026, 5, 10).toISOString(),
      now: new Date(2026, 5, 9, 12),
    });

    expect(result.totalSpentCore).toBe(100);
    expect(result.remaining).toBe(2600);
  });

  it("supports configured salary cycle across year boundary", () => {
    const result = calculateFinance({
      monthlyBudget: 3000,
      salaryDay: 10,
      currency: "BYN",
      fixedExpenses: [],
      recentExpenses: [],
      trackingStartedAt: new Date(2026, 11, 30).toISOString(),
      configuredNextSalaryDate: new Date(2027, 0, 10).toISOString(),
      now: new Date(2026, 11, 31, 12),
    });

    expect(result.currentCycleStart.toISOString()).toBe(
      new Date(2026, 11, 30).toISOString(),
    );
    expect(result.nextSalaryDate.toISOString()).toBe(
      new Date(2027, 0, 10).toISOString(),
    );
  });

  it("supports configured salary cycle when next salary month has fewer days", () => {
    const result = calculateFinance({
      monthlyBudget: 3000,
      salaryDay: 28,
      currency: "BYN",
      fixedExpenses: [],
      recentExpenses: [],
      trackingStartedAt: new Date(2026, 0, 31).toISOString(),
      configuredNextSalaryDate: new Date(2026, 1, 28).toISOString(),
      now: new Date(2026, 1, 1, 12),
    });

    expect(result.currentCycleStart.toISOString()).toBe(
      new Date(2026, 0, 31).toISOString(),
    );
    expect(result.nextSalaryDate.toISOString()).toBe(
      new Date(2026, 1, 28).toISOString(),
    );
  });

  it("supports configured leap-year salary cycle ending on February 29", () => {
    const result = calculateFinance({
      monthlyBudget: 3000,
      salaryDay: 29,
      currency: "BYN",
      fixedExpenses: [],
      recentExpenses: [],
      trackingStartedAt: new Date(2028, 0, 31).toISOString(),
      configuredNextSalaryDate: new Date(2028, 1, 29).toISOString(),
      now: new Date(2028, 1, 10, 12),
    });

    expect(result.currentCycleStart.toISOString()).toBe(
      new Date(2028, 0, 31).toISOString(),
    );
    expect(result.nextSalaryDate.toISOString()).toBe(
      new Date(2028, 1, 29).toISOString(),
    );
  });

  it("falls back to salary day logic when configured next salary date is invalid", () => {
    const result = calculateFinance({
      monthlyBudget: 1000,
      salaryDay: 25,
      currency: "BYN",
      fixedExpenses: [],
      recentExpenses: [],
      trackingStartedAt: "2026-03-25T00:00:00.000Z",
      configuredNextSalaryDate: "not-a-date",
      now: new Date("2026-04-15T12:00:00.000Z"),
    });

    expect(result.currentCycleStart.toISOString()).toBe(
      new Date(2026, 2, 25).toISOString(),
    );
    expect(result.nextSalaryDate.toISOString()).toBe(
      new Date(2026, 3, 25).toISOString(),
    );
  });

  it("falls back to salary day logic when configured next salary date is in the past", () => {
    const result = calculateFinance({
      monthlyBudget: 1000,
      salaryDay: 25,
      currency: "BYN",
      fixedExpenses: [],
      recentExpenses: [],
      trackingStartedAt: "2026-03-25T00:00:00.000Z",
      configuredNextSalaryDate: "2026-04-01T00:00:00.000Z",
      now: new Date("2026-04-15T12:00:00.000Z"),
    });

    expect(result.currentCycleStart.toISOString()).toBe(
      new Date(2026, 2, 25).toISOString(),
    );
    expect(result.nextSalaryDate.toISOString()).toBe(
      new Date(2026, 3, 25).toISOString(),
    );
  });

  it("keeps period forecast stable when there are no recent expenses near the end of the cycle", () => {
    const expenses: Expense[] = [
      createExpense("early-1", 1000, new Date(2026, 4, 8, 10).toISOString()),
      createExpense("early-2", 800, new Date(2026, 4, 9, 10).toISOString()),
    ];

    const result = calculateFinance({
      monthlyBudget: 2700,
      salaryDay: 10,
      currency: "BYN",
      fixedExpenses: [],
      recentExpenses: expenses,
      trackingStartedAt: new Date(2026, 4, 8).toISOString(),
      configuredNextSalaryDate: new Date(2026, 5, 10).toISOString(),
      now: new Date(2026, 5, 9, 12),
    });

    expect(Number.isFinite(result.periodForecast)).toBe(true);
    expect(result.periodForecast).toBeLessThanOrEqual(result.remaining);
  });

  it("makes period forecast worse when recent spending pace increases near the end of the cycle", () => {
    const lowRecentExpenses: Expense[] = [
      createExpense("early", 1000, new Date(2026, 4, 8, 10).toISOString()),
      createExpense("late-small", 10, new Date(2026, 5, 9, 10).toISOString()),
    ];

    const highRecentExpenses: Expense[] = [
      createExpense("early", 1000, new Date(2026, 4, 8, 10).toISOString()),
      createExpense("late-large", 300, new Date(2026, 5, 9, 10).toISOString()),
    ];

    const baseInput = {
      monthlyBudget: 2700,
      salaryDay: 10,
      currency: "BYN" as const,
      fixedExpenses: [],
      trackingStartedAt: new Date(2026, 4, 8).toISOString(),
      configuredNextSalaryDate: new Date(2026, 5, 10).toISOString(),
      now: new Date(2026, 5, 9, 12),
    };

    const lowRecentResult = calculateFinance({
      ...baseInput,
      recentExpenses: lowRecentExpenses,
    });

    const highRecentResult = calculateFinance({
      ...baseInput,
      recentExpenses: highRecentExpenses,
    });

    expect(highRecentResult.periodForecast).toBeLessThan(
      lowRecentResult.periodForecast,
    );
  });

  it("uses configured current cycle start instead of tracking start for incomplete first week", () => {
    const expenses: Expense[] = [
      createExpense(
        "before-period",
        500,
        new Date(2026, 4, 7, 10).toISOString(),
      ),
      createExpense(
        "period-start",
        100,
        new Date(2026, 4, 8, 10).toISOString(),
      ),
    ];

    const result = calculateFinance({
      monthlyBudget: 3200,
      salaryDay: 10,
      currency: "BYN",
      fixedExpenses: [],
      recentExpenses: expenses,
      trackingStartedAt: new Date(2026, 4, 5).toISOString(),
      configuredCurrentCycleStartDate: new Date(2026, 4, 8).toISOString(),
      configuredNextSalaryDate: new Date(2026, 5, 10).toISOString(),
      now: new Date(2026, 4, 8, 12),
    });

    expect(result.currentCycleStart.toISOString()).toBe(
      new Date(2026, 4, 8).toISOString(),
    );
    expect(result.nextSalaryDate.toISOString()).toBe(
      new Date(2026, 5, 10).toISOString(),
    );
    expect(result.currentWeekStart.toISOString()).toBe(
      new Date(2026, 4, 8).toISOString(),
    );
    expect(result.currentWeekEnd.toISOString()).toBe(
      new Date(2026, 4, 10).toISOString(),
    );
    expect(result.totalSpentCore).toBe(100);
    expect(result.remaining).toBe(3100);
  });
});

it("bases period forecast on recent spending pace instead of amplifying old overspend", () => {
  const expenses: Expense[] = [
    createExpense("early-1", 1000, new Date(2026, 4, 8, 10).toISOString()),
    createExpense("early-2", 800, new Date(2026, 4, 9, 10).toISOString()),
    createExpense("early-3", 700, new Date(2026, 4, 10, 10).toISOString()),
    createExpense("late-1", 5, new Date(2026, 5, 8, 10).toISOString()),
    createExpense("late-2", 10, new Date(2026, 5, 9, 10).toISOString()),
  ];

  const result = calculateFinance({
    monthlyBudget: 2700,
    salaryDay: 10,
    currency: "BYN",
    fixedExpenses: [],
    recentExpenses: expenses,
    trackingStartedAt: new Date(2026, 4, 8).toISOString(),
    configuredCurrentCycleStartDate: new Date(2026, 4, 8).toISOString(),
    configuredNextSalaryDate: new Date(2026, 5, 10).toISOString(),
    now: new Date(2026, 5, 9, 12),
  });

  expect(result.remaining).toBe(185);
  expect(result.periodForecast).toBeGreaterThan(150);
  expect(result.periodForecast).toBeLessThanOrEqual(result.remaining);
});
