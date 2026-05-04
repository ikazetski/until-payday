import { describe, expect, it } from "vitest";

import {
  buildPeriodSpendingRhythm,
  buildWeekSpendingRhythm,
} from "@/domain/analyticsEngine";

import type { Expense } from "@/domain/financeTypes";

function expense(id: string, amount: number, createdAt: string): Expense {
  return {
    id,
    amount,
    category: "food",
    categoryNameSnapshot: "Еда",
    note: "",
    createdAt,
  };
}

describe("analyticsEngine", () => {
  describe("buildWeekSpendingRhythm", () => {
    it("groups weekly expenses by weekday and keeps weekday labels", () => {
      const result = buildWeekSpendingRhythm({
        expenses: [
          expense("1", 10, "2026-04-06T10:00:00.000Z"), // Monday
          expense("2", 20, "2026-04-06T18:00:00.000Z"), // Monday
          expense("3", 15, "2026-04-12T12:00:00.000Z"), // Sunday
        ],
      });

      expect(result.items.map((item) => item.label)).toEqual([
        "ПН",
        "ВТ",
        "СР",
        "ЧТ",
        "ПТ",
        "СБ",
        "ВС",
      ]);

      expect(result.items[0]).toMatchObject({
        key: "day-0",
        label: "ПН",
        amount: 30,
        isPeak: true,
      });

      expect(result.items[6]).toMatchObject({
        key: "day-6",
        label: "ВС",
        amount: 15,
        isPeak: false,
      });

      expect(result.averageLabel).toBe("в день");
      expect(result.averageAmount).toBe(6.4);
      expect(result.peakLabel).toBe("ПН");
      expect(result.peakShare).toBe(66.7);
    });
  });

  describe("buildPeriodSpendingRhythm", () => {
    it("uses compact week labels and keeps exact date ranges in tooltipLabel", () => {
      const result = buildPeriodSpendingRhythm({
        cycleStart: new Date(2026, 3, 10), // 10 Apr 2026
        nextSalaryDate: new Date(2026, 4, 1), // 1 May 2026, exclusive
        expenses: [
          expense("1", 100, "2026-04-10T10:00:00.000Z"),
          expense("2", 50, "2026-04-18T10:00:00.000Z"),
          expense("3", 25, "2026-04-30T10:00:00.000Z"),
        ],
      });

      expect(result.items.map((item) => item.label)).toEqual([
        "Н1",
        "Н2",
        "Н3",
      ]);

      expect(result.items.map((item) => item.tooltipLabel)).toEqual([
        "10–16",
        "17–23",
        "24–30",
      ]);

      expect(result.items.map((item) => item.amount)).toEqual([100, 50, 25]);

      expect(result.averageLabel).toBe("в неделю");
      expect(result.averageAmount).toBe(58.3);
      expect(result.peakLabel).toBe("10–16");
      expect(result.peakShare).toBe(57.1);
    });

    it("shows cross-month tooltipLabel for incomplete final week", () => {
      const result = buildPeriodSpendingRhythm({
        cycleStart: new Date(2026, 3, 20), // 20 Apr 2026
        nextSalaryDate: new Date(2026, 4, 3), // 3 May 2026, exclusive
        expenses: [
          expense("1", 40, "2026-04-29T10:00:00.000Z"),
          expense("2", 60, "2026-05-02T10:00:00.000Z"),
        ],
      });

      expect(result.items.map((item) => item.label)).toEqual(["Н1", "Н2"]);

      expect(result.items.map((item) => item.tooltipLabel)).toEqual([
        "20–26",
        "27.4–2.5",
      ]);

      expect(result.items.map((item) => item.amount)).toEqual([0, 100]);

      expect(result.averageAmount).toBe(50);
      expect(result.peakLabel).toBe("27.4–2.5");
      expect(result.peakShare).toBe(100);
    });
  });
});