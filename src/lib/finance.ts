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
  return startOfDay(
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + days),
  );
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
  const thisMonthDate = new Date(
    year,
    month,
    getSafeDay(year, month, salaryDay),
  );

  if (thisMonthDate > day) return thisMonthDate;

  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonth = (month + 1) % 12;
  return new Date(
    nextMonthYear,
    nextMonth,
    getSafeDay(nextMonthYear, nextMonth, salaryDay),
  );
}

export function getPreviousSalaryDateFrom(baseDate: Date, salaryDay: number) {
  const day = startOfDay(baseDate);
  const year = day.getFullYear();
  const month = day.getMonth();
  const thisMonthDate = new Date(
    year,
    month,
    getSafeDay(year, month, salaryDay),
  );

  if (thisMonthDate <= day) return thisMonthDate;

  const prevMonthYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;
  return new Date(
    prevMonthYear,
    prevMonth,
    getSafeDay(prevMonthYear, prevMonth, salaryDay),
  );
}

export function getWeekStart(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDay(
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff),
  );
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
  return start.getTime() < endExclusive.getTime()
    ? { start, endExclusive }
    : null;
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

function parseFutureConfiguredSalaryDate(
  value: string | undefined,
  today: Date,
): Date | null {
  if (!value) return null;

  const parsed = startOfDay(new Date(value));

  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getTime() <= startOfDay(today).getTime()) return null;

  return parsed;
}

function parseConfiguredCycleStartDate(
  value: string | undefined,
  today: Date,
  nextSalaryDate: Date,
): Date | null {
  if (!value) return null;

  const parsed = startOfDay(new Date(value));

  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getTime() > startOfDay(today).getTime()) return null;
  if (parsed.getTime() >= nextSalaryDate.getTime()) return null;

  return parsed;
}

export function getCycleRange(
  today: Date,
  salaryDay: number,
  trackingStartedAt: string,
  configuredNextSalaryDate?: string,
  configuredCurrentCycleStartDate?: string,
): DateRange {
  const currentDay = startOfDay(today);
  const trackingStart = startOfDay(new Date(trackingStartedAt));

  const futureConfiguredSalaryDate = parseFutureConfiguredSalaryDate(
    configuredNextSalaryDate,
    currentDay,
  );

  if (futureConfiguredSalaryDate) {
    const configuredCycleStart = parseConfiguredCycleStartDate(
      configuredCurrentCycleStartDate,
      currentDay,
      futureConfiguredSalaryDate,
    );

    const fallbackCycleStart = getMaxDate(
      getPreviousSalaryDateFrom(
        addDays(futureConfiguredSalaryDate, -1),
        salaryDay,
      ),
      trackingStart,
    );

    return makeRange(
      configuredCycleStart ?? fallbackCycleStart,
      futureConfiguredSalaryDate,
    );
  }

  const nextSalaryDate = getNextSalaryDateFrom(currentDay, salaryDay);
  const previousSalaryDate = getPreviousSalaryDateFrom(currentDay, salaryDay);
  const cycleStart = getMaxDate(previousSalaryDate, trackingStart);

  return makeRange(cycleStart, nextSalaryDate);
}

export function getCurrentWeekRange(
  today: Date,
  cycleRange: DateRange,
): DateRange | null {
  const calendarWeek = makeRange(
    getWeekStart(today),
    addDays(getWeekEnd(today), 1),
  );
  return intersectRanges(calendarWeek, cycleRange);
}
