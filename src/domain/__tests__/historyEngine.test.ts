import { describe, expect, it } from "vitest";
import {
  buildMonthlyGroups,
  buildWeeklyGroups,
} from "@/domain/historyEngine";
import type { Expense } from "@/hooks/useFinanceStore";

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

describe("historyEngine", () => {
  it("builds weekly groups and calculates current week total", () => {
    const expenses: Expense[] = [
      createExpense("1", 50, "2026-04-15T09:00:00.000Z"),
      createExpense("2", 20, "2026-04-14T09:00:00.000Z"),
      createExpense("3", 30, "2026-04-06T09:00:00.000Z"),
    ];

    const groups = buildWeeklyGroups(
      expenses,
      1000,
      25,
      "2026-03-25T00:00:00.000Z",
      new Date("2026-04-15T12:00:00.000Z")
    );

    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].isCurrent).toBe(true);
    expect(groups[0].total).toBe(70);
    expect(groups[0].expenses.map((expense) => expense.id)).toEqual([
      "1",
      "2",
    ]);
  });

  it("builds monthly cycle groups and calculates current period total", () => {
    const expenses: Expense[] = [
      createExpense("1", 50, "2026-04-15T09:00:00.000Z"),
      createExpense("2", 20, "2026-04-14T09:00:00.000Z"),
      createExpense("3", 999, "2026-03-20T09:00:00.000Z"),
    ];

    const groups = buildMonthlyGroups(
      expenses,
      1000,
      25,
      "2026-03-25T00:00:00.000Z",
      new Date("2026-04-15T12:00:00.000Z")
    );

    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].isCurrent).toBe(true);
    expect(groups[0].total).toBe(70);
    expect(groups[0].limit).toBe(1000);
    expect(groups[0].delta).toBe(930);
  });

  it("returns groups without crashing when there are no expenses", () => {
    const weeklyGroups = buildWeeklyGroups(
      [],
      1000,
      25,
      "2026-03-25T00:00:00.000Z",
      new Date("2026-04-15T12:00:00.000Z")
    );

    const monthlyGroups = buildMonthlyGroups(
      [],
      1000,
      25,
      "2026-03-25T00:00:00.000Z",
      new Date("2026-04-15T12:00:00.000Z")
    );

    expect(weeklyGroups.length).toBeGreaterThan(0);
    expect(monthlyGroups.length).toBeGreaterThan(0);
    expect(weeklyGroups[0].total).toBe(0);
    expect(monthlyGroups[0].total).toBe(0);
  });
});