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

function formatWeekTitle(start: Date, end: Date) {
  return `${format(start, "d MMM", { locale: ru })} – ${format(end, "d MMM", { locale: ru })}`;
}

export function buildWeeklyGroups(
  expenses: Expense[],
  monthlyBudget: number,
  salaryDay: number,
  trackingStartedAt: string,
  now = new Date()
): HistoryGroup[] {
  const today = startOfDay(now);
  const groups: HistoryGroup[] = [];
  const currentWeekStart = getWeekStart(today);
  const currentCycle = getCycleRange(today, salaryDay, trackingStartedAt);
  const currentWeekRange = getCurrentWeekRange(today, currentCycle);

  for (let i = 0; i < 12; i += 1) {
    const calendarWeekStart = addDays(currentWeekStart, -7 * i);
    const calendarWeekEndInclusive = addDays(calendarWeekStart, 6);

    const cycleRange = getCycleRange(calendarWeekStart, salaryDay, trackingStartedAt);
    const calendarWeekRange = makeRange(calendarWeekStart, addDays(calendarWeekEndInclusive, 1));
    const visibleRange = intersectRanges(calendarWeekRange, cycleRange);

    if (!visibleRange) continue;

    const visibleExpenses = filterExpensesByRange(expenses, visibleRange).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const derived = calculateFinance({
      monthlyBudget,
      salaryDay,
      currency: "BYN",
      fixedExpenses: [],
      recentExpenses: expenses,
      trackingStartedAt,
      now: visibleRange.start,
    });

    const limit = derived.weeklyBudget;
    const total = sumExpenses(visibleExpenses);

    groups.push({
      id: `week-${visibleRange.start.toISOString()}-${cycleRange.start.toISOString()}`,
      title: formatWeekTitle(visibleRange.start, addDays(visibleRange.endExclusive, -1)),
      subtitle:
        currentWeekRange !== null &&
        visibleRange.start.getTime() === currentWeekRange.start.getTime()
          ? "Текущая неделя"
          : undefined,
      total,
      limit,
      delta: roundMoney(limit - total),
      expenses: visibleExpenses,
      isCurrent:
        currentWeekRange !== null &&
        visibleRange.start.getTime() === currentWeekRange.start.getTime(),
    });
  }

  return groups;
}

export function buildMonthlyGroups(
  expenses: Expense[],
  monthlyBudget: number,
  salaryDay: number,
  trackingStartedAt: string,
  now = new Date()
): HistoryGroup[] {
  const today = startOfDay(now);
  const groups: HistoryGroup[] = [];
  let cursor = today;
  let previousCycleStartTime: number | null = null;

  for (let i = 0; i < 6; i += 1) {
    const cycleRange = getCycleRange(cursor, salaryDay, trackingStartedAt);
    const cycleStart = cycleRange.start;
    const cycleEndInclusive = addDays(cycleRange.endExclusive, -1);

    if (previousCycleStartTime === cycleStart.getTime()) break;

    const cycleExpenses = filterExpensesByRange(expenses, cycleRange).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = sumExpenses(cycleExpenses);

    groups.push({
      id: `cycle-${cycleStart.toISOString()}`,
      title: `${format(cycleStart, "d MMM", { locale: ru })} – ${format(
        cycleEndInclusive,
        "d MMM",
        { locale: ru }
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