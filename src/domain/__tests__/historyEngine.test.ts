import { describe, expect, it } from "vitest";
import { buildMonthlyGroups, buildWeeklyGroups } from "@/domain/historyEngine";
import type { Expense } from "@/domain/financeTypes";

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

function expectLocalDate(
  actual: Date | undefined,
  year: number,
  monthIndex: number,
  day: number,
) {
  expect(actual).toBeInstanceOf(Date);
  expect(actual?.getFullYear()).toBe(year);
  expect(actual?.getMonth()).toBe(monthIndex);
  expect(actual?.getDate()).toBe(day);
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
      new Date("2026-04-15T12:00:00.000Z"),
    );

    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].isCurrent).toBe(true);
    expect(groups[0].total).toBe(70);
    expect(groups[0].expenses.map((expense) => expense.id)).toEqual(["1", "2"]);
    expect(groups[0].rangeStart).toBeInstanceOf(Date);
    expect(groups[0].rangeEndExclusive).toBeInstanceOf(Date);
    expect(groups[0].rangeStart.getTime()).toBeLessThan(
      groups[0].rangeEndExclusive.getTime(),
    );
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
      new Date("2026-04-15T12:00:00.000Z"),
    );

    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].isCurrent).toBe(true);
    expect(groups[0].total).toBe(70);
    expect(groups[0].limit).toBe(1000);
    expect(groups[0].delta).toBe(930);
    expect(groups[0].rangeStart).toBeInstanceOf(Date);
    expect(groups[0].rangeEndExclusive).toBeInstanceOf(Date);
    expect(groups[0].rangeStart.getTime()).toBeLessThan(
      groups[0].rangeEndExclusive.getTime(),
    );
  });

  it("includes partial first week when salary period starts in the middle of a calendar week", () => {
    const expenses: Expense[] = [
      createExpense("1", 10, "2026-04-10T10:00:00.000Z"),
      createExpense("2", 20, "2026-04-11T10:00:00.000Z"),
      createExpense("3", 30, "2026-04-13T10:00:00.000Z"),
    ];

    const groups = buildWeeklyGroups(
      expenses,
      1000,
      10,
      "2026-04-10T00:00:00.000Z",
      new Date("2026-04-26T12:00:00.000Z"),
    );

    const partialFirstWeek = groups.find(
      (group) =>
        group.title.includes("10 апр.") && group.title.includes("12 апр."),
    );

    expect(partialFirstWeek).toBeDefined();
    expect(partialFirstWeek?.total).toBe(30);
    expect(partialFirstWeek?.expenses.map((expense) => expense.id)).toEqual([
      "2",
      "1",
    ]);
    expectLocalDate(partialFirstWeek?.rangeStart, 2026, 3, 10);
    expectLocalDate(partialFirstWeek?.rangeEndExclusive, 2026, 3, 13);
  });

  it("adds exact salary period range to monthly groups", () => {
    const expenses: Expense[] = [
      createExpense("1", 50, "2026-04-15T09:00:00.000Z"),
    ];

    const groups = buildMonthlyGroups(
      expenses,
      1000,
      25,
      "2026-03-25T00:00:00.000Z",
      new Date("2026-04-15T12:00:00.000Z"),
    );

    expectLocalDate(groups[0].rangeStart, 2026, 2, 25);
    expectLocalDate(groups[0].rangeEndExclusive, 2026, 3, 25);
  });

  it("returns groups without crashing when there are no expenses", () => {
    const weeklyGroups = buildWeeklyGroups(
      [],
      1000,
      25,
      "2026-03-25T00:00:00.000Z",
      new Date("2026-04-15T12:00:00.000Z"),
    );

    const monthlyGroups = buildMonthlyGroups(
      [],
      1000,
      25,
      "2026-03-25T00:00:00.000Z",
      new Date("2026-04-15T12:00:00.000Z"),
    );

    expect(weeklyGroups.length).toBeGreaterThan(0);
    expect(monthlyGroups.length).toBeGreaterThan(0);
    expect(weeklyGroups[0].total).toBe(0);
    expect(monthlyGroups[0].total).toBe(0);
  });

  it("builds current incomplete week from configured cycle start to calendar week end", () => {
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
      createExpense("inside-week", 50, new Date(2026, 4, 9, 10).toISOString()),
    ];

    const groups = buildWeeklyGroups(
      expenses,
      3200,
      10,
      new Date(2026, 4, 5).toISOString(),
      new Date(2026, 4, 8, 12),
      new Date(2026, 5, 10).toISOString(),
      new Date(2026, 4, 8).toISOString(),
    );

    expect(groups[0].isCurrent).toBe(true);
    expectLocalDate(groups[0].rangeStart, 2026, 4, 8);
    expectLocalDate(groups[0].rangeEndExclusive, 2026, 4, 11);
    expect(groups[0].title).toContain("8 мая");
    expect(groups[0].title).toContain("10 мая");
    expect(groups[0].total).toBe(150);
    expect(groups[0].expenses.map((expense) => expense.id)).toEqual([
      "inside-week",
      "period-start",
    ]);
  });

  it("builds current period from configured cycle start to configured next salary date", () => {
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
      createExpense(
        "inside-period",
        50,
        new Date(2026, 5, 9, 10).toISOString(),
      ),
      createExpense(
        "next-period",
        999,
        new Date(2026, 5, 10, 10).toISOString(),
      ),
    ];

    const groups = buildMonthlyGroups(
      expenses,
      3200,
      10,
      new Date(2026, 4, 5).toISOString(),
      new Date(2026, 4, 8, 12),
      new Date(2026, 5, 10).toISOString(),
      new Date(2026, 4, 8).toISOString(),
    );

    expect(groups[0].isCurrent).toBe(true);
    expectLocalDate(groups[0].rangeStart, 2026, 4, 8);
    expectLocalDate(groups[0].rangeEndExclusive, 2026, 5, 10);
    expect(groups[0].title).toContain("8 мая");
    expect(groups[0].title).toContain("9 июн");
    expect(groups[0].total).toBe(150);
    expect(groups[0].limit).toBe(3200);
    expect(groups[0].delta).toBe(3050);
  });

  it("uses historical budget snapshot for previous period monthly group", () => {
    const expenses: Expense[] = [
      createExpense(
        "previous-period",
        4057.81,
        new Date(2026, 4, 1, 10).toISOString(),
      ),
      createExpense(
        "current-period",
        162.7,
        new Date(2026, 4, 11, 10).toISOString(),
      ),
    ];

    const groups = buildMonthlyGroups(
      expenses,
      3200,
      10,
      new Date(2026, 3, 10).toISOString(),
      new Date(2026, 4, 11, 12),
      new Date(2026, 5, 10).toISOString(),
      new Date(2026, 4, 8).toISOString(),
      [
        {
          cycleStartDate: new Date(2026, 3, 10).toISOString(),
          nextSalaryDate: new Date(2026, 4, 8).toISOString(),
          monthlyBudget: 2700,
          currency: "BYN",
          createdAt: new Date(2026, 4, 8).toISOString(),
        },
      ],
    );

    const currentPeriod = groups[0];
    const previousPeriod = groups[1];

    expect(currentPeriod.limit).toBe(3200);
    expect(currentPeriod.total).toBe(162.7);
    expect(currentPeriod.delta).toBe(3037.3);

    expect(previousPeriod.limit).toBe(2700);
    expect(previousPeriod.total).toBe(4057.81);
    expect(previousPeriod.delta).toBeCloseTo(-1357.81);
    expectLocalDate(previousPeriod.rangeStart, 2026, 3, 10);
    expectLocalDate(previousPeriod.rangeEndExclusive, 2026, 4, 8);
  });
});
