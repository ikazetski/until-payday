import type { Expense, FixedExpense, CurrencyCode } from "@/hooks/useFinanceStore";
import {
  addDays,
  countInclusiveDays,
  filterExpensesByRange,
  getCurrentWeekRange,
  getCycleRange,
  roundMoney,
  startOfDay,
  type DateRange,
} from "@/lib/finance";

export type Status = "green" | "yellow" | "red";

export type FinanceInput = {
  monthlyBudget: number;
  salaryDay: number;
  currency: CurrencyCode;
  fixedExpenses: FixedExpense[];
  recentExpenses: Expense[];
  trackingStartedAt: string;
  now?: Date;
};

export type DaySnapshot = {
  date: Date;
  spent: number;
  budgetAtStartOfDay: number;
  plannedForDay: number;
  availableForDay: number;
  deviation: number;
  isToday: boolean;
  isPast: boolean;
};

export type PeriodMetrics = {
  start: Date;
  endInclusive: Date;
  totalSpent: number;
  budget: number;
  remaining: number;
  savings: number;
  status: Status;
};

export type WeekMetrics = {
  start: Date;
  endInclusive: Date;
  spent: number;
  budget: number;
  remaining: number;
  savings: number;
  todayAvailable: number;
  status: Status;
};

export type DerivedFinance = {
  remaining: number;
  daysLeft: number;
  dailyBudget: number;
  spentToday: number;
  todayAvailable: number;
  weeklyTodayAvailable: number;
  savings: number;
  fixedTotal: number;
  totalSpentCore: number;
  previousSalaryDate: Date;
  currentCycleStart: Date;
  nextSalaryDate: Date;
  status: Status;
  weeklyBudget: number;
  weeklyRemaining: number;
  weeklySavings: number;
  weeklySpent: number;
  weeklyStatus: Status;
  currentWeekStart: Date;
  currentWeekEnd: Date;
};

function toDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function resolveStatus(remaining: number, savings: number): Status {
  if (remaining < -0.01) return "red";
  if (savings < -0.01) return "yellow";
  return "green";
}

function buildExpensesByDay(expenses: Expense[]) {
  const map = new Map<string, number>();

  for (const expense of expenses) {
    const key = toDayKey(startOfDay(new Date(expense.createdAt)));
    map.set(key, roundMoney((map.get(key) ?? 0) + expense.amount));
  }

  return map;
}

function buildCycleDaySnapshots(
  cycleRange: DateRange,
  expenses: Expense[],
  monthlyBudget: number,
  now: Date
): DaySnapshot[] {
  const today = startOfDay(now);
  const expensesByDay = buildExpensesByDay(expenses);

  const days: DaySnapshot[] = [];
  let cursor = cycleRange.start;
  let budgetAtStartOfDay = monthlyBudget;

  while (cursor.getTime() < cycleRange.endExclusive.getTime()) {
    const spent = expensesByDay.get(toDayKey(cursor)) ?? 0;
    const isToday = cursor.getTime() === today.getTime();
    const isPast = cursor.getTime() < today.getTime();

    const daysRemainingInCycle = Math.max(
      1,
      countInclusiveDays(cursor, addDays(cycleRange.endExclusive, -1))
    );

    const plannedForDay = roundMoney(
      Math.max(0, budgetAtStartOfDay / daysRemainingInCycle)
    );

    const availableForDay = roundMoney(Math.max(0, plannedForDay - spent));
    const deviation = roundMoney(plannedForDay - spent);

    days.push({
      date: cursor,
      spent: roundMoney(spent),
      budgetAtStartOfDay: roundMoney(budgetAtStartOfDay),
      plannedForDay,
      availableForDay,
      deviation,
      isToday,
      isPast,
    });

    budgetAtStartOfDay = roundMoney(budgetAtStartOfDay - spent);
    cursor = addDays(cursor, 1);
  }

  return days;
}

function sumPlanned(days: DaySnapshot[]) {
  return roundMoney(days.reduce((sum, day) => sum + day.plannedForDay, 0));
}

function sumSpent(days: DaySnapshot[]) {
  return roundMoney(days.reduce((sum, day) => sum + day.spent, 0));
}

function sumSavings(days: DaySnapshot[]) {
  return roundMoney(
    days.reduce((sum, day) => {
      if (day.isPast) return sum + day.deviation;
      return sum + Math.min(0, day.deviation);
    }, 0)
  );
}

function buildPeriodMetrics(
  cycleRange: DateRange,
  cycleDays: DaySnapshot[],
  monthlyBudget: number
): PeriodMetrics {
  const totalSpent = sumSpent(cycleDays);
  const budget = roundMoney(monthlyBudget);
  const remaining = roundMoney(budget - totalSpent);
  const savings = sumSavings(cycleDays);

  return {
    start: cycleRange.start,
    endInclusive: addDays(cycleRange.endExclusive, -1),
    totalSpent,
    budget,
    remaining,
    savings,
    status: resolveStatus(remaining, savings),
  };
}

function buildWeekMetrics(
  weekRange: DateRange | null,
  cycleDays: DaySnapshot[]
): WeekMetrics {
  if (!weekRange) {
    return {
      start: cycleDays[0]?.date ?? new Date(),
      endInclusive: cycleDays[0]?.date ?? new Date(),
      spent: 0,
      budget: 0,
      remaining: 0,
      savings: 0,
      todayAvailable: 0,
      status: "green",
    };
  }

  const weekStart = weekRange.start.getTime();
  const weekEnd = weekRange.endExclusive.getTime();

  const weekDays = cycleDays.filter(
    (day) => day.date.getTime() >= weekStart && day.date.getTime() < weekEnd
  );

  const spent = sumSpent(weekDays);
  const budget = sumPlanned(weekDays);
  const remaining = roundMoney(budget - spent);
  const savings = sumSavings(weekDays);
  const today = weekDays.find((day) => day.isToday);

  const rawTodayAvailable = today?.availableForDay ?? 0;
  const cappedTodayAvailable = roundMoney(
    Math.min(rawTodayAvailable, Math.max(0, remaining))
  );

  return {
    start: weekRange.start,
    endInclusive: addDays(weekRange.endExclusive, -1),
    spent,
    budget,
    remaining,
    savings,
    todayAvailable: cappedTodayAvailable,
    status: resolveStatus(remaining, savings),
  };
}

export function calculateFinance(input: FinanceInput): DerivedFinance {
  const today = startOfDay(input.now ?? new Date());

  const cycleRange = getCycleRange(today, input.salaryDay, input.trackingStartedAt);
  const weekRange = getCurrentWeekRange(today, cycleRange);
  const cycleExpenses = filterExpensesByRange(input.recentExpenses, cycleRange);

  const cycleDays = buildCycleDaySnapshots(
    cycleRange,
    cycleExpenses,
    input.monthlyBudget,
    today
  );

  const period = buildPeriodMetrics(
  cycleRange,
  cycleDays,
  input.monthlyBudget
  );
  const week = buildWeekMetrics(weekRange, cycleDays);

  const todaySnapshot = cycleDays.find((day) => day.isToday);

  const fixedTotal = roundMoney(
    input.fixedExpenses.reduce((sum, item) => sum + item.amount, 0)
  );

  const daysLeft = Math.max(
    1,
    countInclusiveDays(today, addDays(cycleRange.endExclusive, -1))
  );

  return {
    remaining: period.remaining,
    daysLeft,
    dailyBudget: todaySnapshot?.plannedForDay ?? 0,
    spentToday: todaySnapshot?.spent ?? 0,
    todayAvailable: todaySnapshot?.availableForDay ?? 0,
    weeklyTodayAvailable: week.todayAvailable,
    savings: period.savings,
    fixedTotal,
    totalSpentCore: period.totalSpent,
    previousSalaryDate: cycleRange.start,
    currentCycleStart: cycleRange.start,
    nextSalaryDate: cycleRange.endExclusive,
    status: period.status,
    weeklyBudget: week.budget,
    weeklyRemaining: week.remaining,
    weeklySavings: week.savings,
    weeklySpent: week.spent,
    weeklyStatus: week.status,
    currentWeekStart: week.start,
    currentWeekEnd: week.endInclusive,
  };
}