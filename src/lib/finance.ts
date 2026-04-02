import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { Expense } from "@/hooks/useFinanceStore";

const DAY_MS = 1000 * 60 * 60 * 24;

export type DateRange = {
  start: Date;
  endExclusive: Date;
};

export function roundMoney(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number) {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

export function countInclusiveDays(start: Date, end: Date) {
  const s = startOfDay(start);
  const e = startOfDay(end);
  if (s.getTime() > e.getTime()) return 0;
  return Math.floor((e.getTime() - s.getTime()) / DAY_MS) + 1;
}

export function getMaxDate(a: Date, b: Date) {
  return a.getTime() >= b.getTime() ? a : b;
}

export function getMinDate(a: Date, b: Date) {
  return a.getTime() <= b.getTime() ? a : b;
}

export function getSafeDay(year: number, month: number, salaryDay: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(Math.max(salaryDay, 1), daysInMonth);
}

export function getNextSalaryDateFrom(baseDate: Date, salaryDay: number) {
  const day = startOfDay(baseDate);
  const year = day.getFullYear();
  const month = day.getMonth();
  const thisMonthDate = new Date(year, month, getSafeDay(year, month, salaryDay));

  if (thisMonthDate > day) return thisMonthDate;

  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonth = (month + 1) % 12;
  return new Date(nextMonthYear, nextMonth, getSafeDay(nextMonthYear, nextMonth, salaryDay));
}

export function getPreviousSalaryDateFrom(baseDate: Date, salaryDay: number) {
  const day = startOfDay(baseDate);
  const year = day.getFullYear();
  const month = day.getMonth();
  const thisMonthDate = new Date(year, month, getSafeDay(year, month, salaryDay));

  if (thisMonthDate <= day) return thisMonthDate;

  const prevMonthYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;
  return new Date(prevMonthYear, prevMonth, getSafeDay(prevMonthYear, prevMonth, salaryDay));
}

export function getWeekStart(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff));
}

export function getWeekEnd(date: Date) {
  return addDays(getWeekStart(date), 6);
}

export function makeRange(start: Date, endExclusive: Date): DateRange {
  return { start: startOfDay(start), endExclusive: startOfDay(endExclusive) };
}

export function intersectRanges(a: DateRange, b: DateRange): DateRange | null {
  const start = getMaxDate(a.start, b.start);
  const endExclusive = getMinDate(a.endExclusive, b.endExclusive);
  return start.getTime() < endExclusive.getTime() ? { start, endExclusive } : null;
}

export function isExpenseInRange(expense: Expense, range: DateRange) {
  const time = new Date(expense.createdAt).getTime();
  return time >= range.start.getTime() && time < range.endExclusive.getTime();
}

export function filterExpensesByRange(expenses: Expense[], range: DateRange) {
  return expenses.filter((expense) => isExpenseInRange(expense, range));
}

export function sumExpenses(expenses: Expense[]) {
  return roundMoney(expenses.reduce((sum, item) => sum + item.amount, 0));
}

export function getCycleRange(today: Date, salaryDay: number, trackingStartedAt: string): DateRange {
  const previousSalaryDate = getPreviousSalaryDateFrom(today, salaryDay);
  const nextSalaryDate = getNextSalaryDateFrom(today, salaryDay);
  const trackingStart = startOfDay(new Date(trackingStartedAt));
  const cycleStart = getMaxDate(previousSalaryDate, trackingStart);

  return makeRange(cycleStart, nextSalaryDate);
}

export function getCurrentWeekRange(today: Date, cycleRange: DateRange): DateRange | null {
  const calendarWeek = makeRange(getWeekStart(today), addDays(getWeekEnd(today), 1));
  return intersectRanges(calendarWeek, cycleRange);
}

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
  return `${format(start, "d MMM", { locale: ru })} – ${format(end, "d MMM", {
    locale: ru,
  })}`;
}

function getCycleRangeForDate(
  date: Date,
  salaryDay: number,
  trackingStartedAt: string
) {
  return getCycleRange(date, salaryDay, trackingStartedAt);
}

export function buildWeeklyGroups(
  expenses: Expense[],
  monthlyBudget: number,
  salaryDay: number,
  trackingStartedAt: string,
  now = new Date()
): HistoryGroup[] {
  const today = startOfDay(now);
  const currentCycleRange = getCycleRange(today, salaryDay, trackingStartedAt);
  const trackingStart = startOfDay(new Date(trackingStartedAt));

  const groups: HistoryGroup[] = [];
  const currentWeekStart = getWeekStart(today);

  for (let i = 0; i < 12; i += 1) {
    const calendarWeekStart = addDays(currentWeekStart, -7 * i);
    const calendarWeekEndInclusive = addDays(calendarWeekStart, 6);

    const cycleRange = getCycleRangeForDate(
      calendarWeekStart,
      salaryDay,
      trackingStartedAt
    );

    const weekRange = {
      start: calendarWeekStart,
      endExclusive: addDays(calendarWeekEndInclusive, 1),
    };

    const visibleRange = intersectRanges(weekRange, cycleRange);
    if (!visibleRange) continue;
    if (visibleRange.endExclusive.getTime() <= trackingStart.getTime()) continue;

    const visibleExpenses = filterExpensesByRange(expenses, visibleRange).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = sumExpenses(visibleExpenses);

    const cycleExpenses = filterExpensesByRange(expenses, cycleRange);
    const spentBeforeWeek = sumExpenses(
      cycleExpenses.filter(
        (expense) =>
          new Date(expense.createdAt).getTime() < visibleRange.start.getTime()
      )
    );

    const remainingAtWeekStart = monthlyBudget - spentBeforeWeek;

    const weekEndInclusive = addDays(visibleRange.endExclusive, -1);
    const cycleEndInclusive = addDays(cycleRange.endExclusive, -1);

    const daysToCycleEnd = countInclusiveDays(
      visibleRange.start,
      cycleEndInclusive
    );
    const weekDaysInScope = countInclusiveDays(
      visibleRange.start,
      weekEndInclusive
    );

    const limit =
      daysToCycleEnd > 0 && weekDaysInScope > 0
        ? roundMoney((remainingAtWeekStart / daysToCycleEnd) * weekDaysInScope)
        : 0;

    groups.push({
      id: `week-${visibleRange.start.toISOString()}`,
      title: formatWeekTitle(visibleRange.start, weekEndInclusive),
      subtitle: i === 0 ? "Текущая неделя" : undefined,
      total,
      limit,
      delta: roundMoney(limit - total),
      expenses: visibleExpenses,
      isCurrent:
        visibleRange.start.getTime() ===
        (getCurrentWeekRange(today, currentCycleRange)?.start.getTime() ?? -1),
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

  for (let i = 0; i < 6; i += 1) {
    const cycleRange = getCycleRangeForDate(cursor, salaryDay, trackingStartedAt);
    const cycleStart = cycleRange.start;
    const cycleEndInclusive = addDays(cycleRange.endExclusive, -1);

    const cycleExpenses = filterExpensesByRange(expenses, cycleRange).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    groups.push({
      id: `cycle-${cycleStart.toISOString()}`,
      title: `${format(cycleStart, "d MMM", { locale: ru })} – ${format(
        cycleEndInclusive,
        "d MMM",
        { locale: ru }
      )}`,
      subtitle: i === 0 ? "Текущий период" : undefined,
      total: sumExpenses(cycleExpenses),
      limit: roundMoney(monthlyBudget),
      delta: roundMoney(monthlyBudget - sumExpenses(cycleExpenses)),
      expenses: cycleExpenses,
      isCurrent: i === 0,
    });

    cursor = addDays(cycleStart, -1);
  }

  return groups;
}