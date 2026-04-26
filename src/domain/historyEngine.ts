import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { Expense } from "@/domain/financeTypes";
import {
  addDays,
  filterExpensesByRange,
  getCycleRange,
  getCurrentWeekRange,
  getWeekStart,
  intersectRanges,
  makeRange,
  roundMoney,
  startOfDay,
  sumExpenses,
} from "@/lib/finance";
import { calculateFinance } from "@/domain/financeEngine";

export type HistoryGroup = {
  id: string;
  title: string;
  subtitle?: string;
  total: number;
  limit: number;
  delta: number;
  expenses: Expense[];
  isCurrent: boolean;
};

type HistoryGroupWithSort = HistoryGroup & {
  sortTime: number;
};

const WEEKLY_HISTORY_CYCLES_LIMIT = 12;
const MONTHLY_HISTORY_PERIODS_LIMIT = 12;

function formatWeekTitle(start: Date, end: Date) {
  return `${format(start, "d MMM", { locale: ru })} – ${format(end, "d MMM", {
    locale: ru,
  })}`;
}

function isSameRangeStart(a: Date, b: Date) {
  return a.getTime() === b.getTime();
}

export function buildWeeklyGroups(
  expenses: Expense[],
  monthlyBudget: number,
  salaryDay: number,
  trackingStartedAt: string,
  now = new Date(),
): HistoryGroup[] {
  const today = startOfDay(now);
  const currentCycle = getCycleRange(today, salaryDay, trackingStartedAt);
  const currentWeekRange = getCurrentWeekRange(today, currentCycle);

  const groups: HistoryGroupWithSort[] = [];
  const seen = new Set<string>();

  let cycleCursor = today;
  let previousCycleStartTime: number | null = null;

  for (
    let cycleIndex = 0;
    cycleIndex < WEEKLY_HISTORY_CYCLES_LIMIT;
    cycleIndex += 1
  ) {
    const cycleRange = getCycleRange(cycleCursor, salaryDay, trackingStartedAt);
    const cycleStart = cycleRange.start;
    const cycleEndInclusive = addDays(cycleRange.endExclusive, -1);

    if (previousCycleStartTime === cycleStart.getTime()) break;

    const firstWeekStart =
      cycleIndex === 0 ? getWeekStart(today) : getWeekStart(cycleEndInclusive);

    let weekCursor = firstWeekStart;

    while (addDays(weekCursor, 7).getTime() > cycleStart.getTime()) {
      const calendarWeekRange = makeRange(weekCursor, addDays(weekCursor, 7));
      const visibleRange = intersectRanges(calendarWeekRange, cycleRange);

      if (visibleRange) {
        const visibleStart = visibleRange.start;
        const visibleEndInclusive = addDays(visibleRange.endExclusive, -1);
        const id = `week-${visibleStart.toISOString()}-${visibleRange.endExclusive.toISOString()}`;

        if (!seen.has(id)) {
          seen.add(id);

          const visibleExpenses = filterExpensesByRange(
            expenses,
            visibleRange,
          ).sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );

          const derived = calculateFinance({
            monthlyBudget,
            salaryDay,
            currency: "BYN",
            fixedExpenses: [],
            recentExpenses: expenses,
            trackingStartedAt,
            now: visibleStart,
          });

          const limit = derived.weeklyBudget;
          const total = sumExpenses(visibleExpenses);

          const isCurrent =
            currentWeekRange !== null &&
            isSameRangeStart(visibleStart, currentWeekRange.start);

          groups.push({
            id,
            title: formatWeekTitle(visibleStart, visibleEndInclusive),
            subtitle: isCurrent ? "Текущая неделя" : undefined,
            total,
            limit,
            delta: roundMoney(limit - total),
            expenses: visibleExpenses,
            isCurrent,
            sortTime: visibleStart.getTime(),
          });
        }
      }

      weekCursor = addDays(weekCursor, -7);
    }

    previousCycleStartTime = cycleStart.getTime();
    cycleCursor = addDays(cycleStart, -1);
  }

  return groups
    .sort((a, b) => b.sortTime - a.sortTime)
    .map((group) => {
      const { sortTime, ...historyGroup } = group;
      void sortTime;
      return historyGroup;
    });
}

export function buildMonthlyGroups(
  expenses: Expense[],
  monthlyBudget: number,
  salaryDay: number,
  trackingStartedAt: string,
  now = new Date(),
): HistoryGroup[] {
  const today = startOfDay(now);
  const groups: HistoryGroup[] = [];
  let cursor = today;
  let previousCycleStartTime: number | null = null;

  for (let i = 0; i < MONTHLY_HISTORY_PERIODS_LIMIT; i += 1) {
    const cycleRange = getCycleRange(cursor, salaryDay, trackingStartedAt);
    const cycleStart = cycleRange.start;
    const cycleEndInclusive = addDays(cycleRange.endExclusive, -1);

    if (previousCycleStartTime === cycleStart.getTime()) break;

    const cycleExpenses = filterExpensesByRange(expenses, cycleRange).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const total = sumExpenses(cycleExpenses);

    groups.push({
      id: `cycle-${cycleStart.toISOString()}`,
      title: `${format(cycleStart, "d MMM", { locale: ru })} – ${format(
        cycleEndInclusive,
        "d MMM",
        { locale: ru },
      )}`,
      subtitle: i === 0 ? "Текущий период" : undefined,
      total,
      limit: roundMoney(monthlyBudget),
      delta: roundMoney(monthlyBudget - total),
      expenses: cycleExpenses,
      isCurrent: i === 0,
    });

    previousCycleStartTime = cycleStart.getTime();
    cursor = addDays(cycleStart, -1);
  }

  return groups;
}
