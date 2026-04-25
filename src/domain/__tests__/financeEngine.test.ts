import { describe, expect, it } from "vitest";
import { calculateFinance } from "@/domain/financeEngine";
import type { Expense, FixedExpense } from "@/hooks/useFinanceStore";

function createExpense(
  id: string,
  amount: number,
  createdAt: string,
  category = "food"
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
      new Date(2026, 2, 25).toISOString()
    );
    expect(result.nextSalaryDate.toISOString()).toBe(
      new Date(2026, 3, 25).toISOString()
    );
  });
});