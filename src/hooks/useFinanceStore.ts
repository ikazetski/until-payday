import { create } from "zustand";
import {
  addDays,
  countInclusiveDays,
  filterExpensesByRange,
  getCurrentWeekRange,
  getCycleRange,
  getPreviousSalaryDateFrom,
  getWeekEnd,
  getWeekStart,
  makeRange,
  roundMoney,
  startOfDay,
  sumExpenses,
} from "@/lib/finance";

export type ExpenseCategory =
  | "food"
  | "sport"
  | "fuel"
  | "entertainment"
  | "other";

export type Expense = {
  id: string;
  amount: number;
  category: ExpenseCategory;
  note?: string;
  createdAt: string;
};

export type CurrencyCode = "BYN" | "EUR" | "USD" | "RUB" | "UAH";

export type FixedExpense = {
  id: string;
  name: string;
  amount: number;
};

type Status = "green" | "yellow" | "red";

type PersistedData = {
  monthlyBudget: number;
  salaryDay: number;
  currency: CurrencyCode;
  fixedExpenses: FixedExpense[];
  recentExpenses: Expense[];
  trackingStartedAt: string;
};

type SettingsSnapshot = {
  monthlyBudget: number;
  salaryDay: number;
  currency: CurrencyCode;
  trackingStartedAt: string;
};

type FinanceStore = {
  monthlyBudget: number;
  salaryDay: number;
  currency: CurrencyCode;
  fixedExpenses: FixedExpense[];
  recentExpenses: Expense[];
  trackingStartedAt: string;

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

  addExpense: (
    amount: number,
    category: ExpenseCategory,
    note?: string
  ) => void;
  removeExpense: (id: string) => void;
  addFixedExpense: (name: string, amount: number) => void;
  updateFixedExpense: (id: string, name: string, amount: number) => void;
  removeFixedExpense: (id: string) => void;
  updateSettings: (
    monthlyBudget: number,
    salaryDay: number,
    currency: CurrencyCode
  ) => void;
  restoreSettings: (snapshot: SettingsSnapshot) => void;
  refreshDerived: () => void;
};

const STORAGE_KEY = "until-payday-finance";
const DAY_MS = 1000 * 60 * 60 * 24;

function startOfToday() {
  return startOfDay(new Date());
}

function toDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function calculateDerived(data: PersistedData) {
  const today = startOfToday();

  const cycleRange = getCycleRange(
    today,
    data.salaryDay,
    data.trackingStartedAt
  );

  const weekRange = getCurrentWeekRange(today, cycleRange);

  const cycleExpenses = filterExpensesByRange(data.recentExpenses, cycleRange);
  const totalSpentCore = sumExpenses(cycleExpenses);

  const fixedTotal = roundMoney(
    data.fixedExpenses.reduce((sum, item) => sum + item.amount, 0)
  );

  const remaining = roundMoney(data.monthlyBudget - totalSpentCore);

  const todayRange = makeRange(today, addDays(today, 1));
  const todayExpenses = filterExpensesByRange(cycleExpenses, todayRange);
  const spentToday = sumExpenses(todayExpenses);

  const expensesByDay = new Map<string, number>();
  for (const expense of cycleExpenses) {
    const key = toDayKey(startOfDay(new Date(expense.createdAt)));
    expensesByDay.set(
      key,
      roundMoney((expensesByDay.get(key) ?? 0) + expense.amount)
    );
  }

  let cursor = cycleRange.start;
  let budgetAtStartOfDay = data.monthlyBudget;
  let dailyBudget = 0;
  let monthlyCarryover = 0;

  while (cursor.getTime() <= today.getTime()) {
    const key = toDayKey(cursor);
    const spentThisDay = expensesByDay.get(key) ?? 0;

    const daysRemainingInCycle = Math.max(
      1,
      Math.ceil((cycleRange.endExclusive.getTime() - cursor.getTime()) / DAY_MS)
    );

    const plannedForDay = budgetAtStartOfDay / daysRemainingInCycle;
    const isPastDay = cursor.getTime() < today.getTime();

    if (cursor.getTime() === today.getTime()) {
      dailyBudget = plannedForDay;
    }

    monthlyCarryover += isPastDay
      ? plannedForDay - spentThisDay
      : Math.min(0, plannedForDay - spentThisDay);

    budgetAtStartOfDay -= spentThisDay;
    cursor = addDays(cursor, 1);
  }

  let weeklyBudget = 0;
  let weeklySpent = 0;
  let weeklyCarryover = 0;
  let weeklyTodayAvailable = 0;

  let currentWeekStart = getWeekStart(today);
  let currentWeekEnd = getWeekEnd(today);

  if (weekRange) {
    currentWeekStart = weekRange.start;
    currentWeekEnd = addDays(weekRange.endExclusive, -1);

    const weekExpenses = filterExpensesByRange(cycleExpenses, weekRange);
    weeklySpent = sumExpenses(weekExpenses);

    const spentBeforeWeek = sumExpenses(
      cycleExpenses.filter(
        (expense) =>
          new Date(expense.createdAt).getTime() < weekRange.start.getTime()
      )
    );

    const remainingAtWeekStart = data.monthlyBudget - spentBeforeWeek;

    const weekEndInclusive = addDays(weekRange.endExclusive, -1);
    const cycleEndInclusive = addDays(cycleRange.endExclusive, -1);

    const daysToCycleEnd = countInclusiveDays(
      weekRange.start,
      cycleEndInclusive
    );
    const weekDaysInScope = countInclusiveDays(
      weekRange.start,
      weekEndInclusive
    );

    weeklyBudget =
      daysToCycleEnd > 0 && weekDaysInScope > 0
        ? roundMoney((remainingAtWeekStart / daysToCycleEnd) * weekDaysInScope)
        : 0;

    const weeklyRemaining = weeklyBudget - weeklySpent;
    const weeklyDaysLeft = countInclusiveDays(today, weekEndInclusive);
    const weeklyRemainingAtStartOfToday = weeklyRemaining + spentToday;

    const weeklyTodayBudget =
      weeklyDaysLeft > 0
        ? weeklyRemainingAtStartOfToday / weeklyDaysLeft
        : 0;

    weeklyTodayAvailable = roundMoney(weeklyTodayBudget - spentToday);

    const weekDayExpenses = new Map<string, number>();
    for (const expense of weekExpenses) {
      const key = toDayKey(startOfDay(new Date(expense.createdAt)));
      weekDayExpenses.set(
        key,
        roundMoney((weekDayExpenses.get(key) ?? 0) + expense.amount)
      );
    }

    let weeklyBudgetCursor = weekRange.start;
    let budgetAtWeekStart = remainingAtWeekStart;

    while (weeklyBudgetCursor.getTime() <= today.getTime()) {
      const key = toDayKey(weeklyBudgetCursor);
      const spentThisDay = weekDayExpenses.get(key) ?? 0;

      const daysRemainingInWeekScope = countInclusiveDays(
        weeklyBudgetCursor,
        weekEndInclusive
      );

      const plannedForDay =
        daysRemainingInWeekScope > 0
          ? budgetAtWeekStart / daysRemainingInWeekScope
          : 0;

      const isPastDay = weeklyBudgetCursor.getTime() < today.getTime();

      weeklyCarryover += isPastDay
        ? plannedForDay - spentThisDay
        : Math.min(0, plannedForDay - spentThisDay);

      budgetAtWeekStart -= spentThisDay;
      weeklyBudgetCursor = addDays(weeklyBudgetCursor, 1);
    }
  }

  const todayAvailable = roundMoney(dailyBudget - spentToday);
  const weeklyRemaining = roundMoney(weeklyBudget - weeklySpent);

  let status: Status = "green";
  if (remaining < -0.01) {
    status = "red";
  } else if (monthlyCarryover < -0.01) {
    status = "yellow";
  }

  let weeklyStatus: Status = "green";
  if (weeklyRemaining < -0.01) {
    weeklyStatus = "red";
  } else if (weeklyCarryover < -0.01) {
    weeklyStatus = "yellow";
  }

  const daysLeft = Math.max(
    1,
    Math.ceil((cycleRange.endExclusive.getTime() - today.getTime()) / DAY_MS)
  );

  return {
    remaining: roundMoney(remaining),
    daysLeft,
    dailyBudget: roundMoney(dailyBudget),
    spentToday: roundMoney(spentToday),
    todayAvailable: roundMoney(todayAvailable),
    weeklyTodayAvailable: roundMoney(weeklyTodayAvailable),
    savings: roundMoney(monthlyCarryover),
    fixedTotal,
    totalSpentCore: roundMoney(totalSpentCore),
    previousSalaryDate: getPreviousSalaryDateFrom(today, data.salaryDay),
    currentCycleStart: cycleRange.start,
    nextSalaryDate: cycleRange.endExclusive,
    status,
    weeklyBudget: roundMoney(weeklyBudget),
    weeklyRemaining,
    weeklySavings: roundMoney(weeklyCarryover),
    weeklySpent: roundMoney(weeklySpent),
    weeklyStatus,
    currentWeekStart,
    currentWeekEnd,
  };
}

function loadInitialData(): PersistedData {
  const fallback: PersistedData = {
    monthlyBudget: 0,
    salaryDay: 25,
    currency: "BYN",
    fixedExpenses: [],
    recentExpenses: [],
    trackingStartedAt: startOfToday().toISOString(),
  };

  if (typeof window === "undefined") return fallback;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedData>;

    return {
      monthlyBudget:
        typeof parsed.monthlyBudget === "number"
          ? parsed.monthlyBudget
          : fallback.monthlyBudget,
      salaryDay:
        typeof parsed.salaryDay === "number"
          ? parsed.salaryDay
          : fallback.salaryDay,
      currency:
        parsed.currency === "BYN" ||
        parsed.currency === "EUR" ||
        parsed.currency === "USD" ||
        parsed.currency === "RUB" ||
        parsed.currency === "UAH"
          ? parsed.currency
          : fallback.currency,
      fixedExpenses: Array.isArray(parsed.fixedExpenses)
        ? parsed.fixedExpenses
        : fallback.fixedExpenses,
      recentExpenses: Array.isArray(parsed.recentExpenses)
        ? parsed.recentExpenses
        : fallback.recentExpenses,
      trackingStartedAt:
        typeof parsed.trackingStartedAt === "string"
          ? parsed.trackingStartedAt
          : fallback.trackingStartedAt,
    };
  } catch {
    return fallback;
  }
}

function saveData(data: PersistedData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const initialData = loadInitialData();
const initialDerived = calculateDerived(initialData);

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  ...initialData,
  ...initialDerived,

  addExpense: (amount, category, note) => {
    const current = get();

    const updatedData: PersistedData = {
      monthlyBudget: current.monthlyBudget,
      salaryDay: current.salaryDay,
      currency: current.currency,
      fixedExpenses: current.fixedExpenses,
      recentExpenses: [
        {
          id: crypto.randomUUID(),
          amount: roundMoney(amount),
          category,
          note,
          createdAt: new Date().toISOString(),
        },
        ...current.recentExpenses,
      ],
      trackingStartedAt: current.trackingStartedAt,
    };

    saveData(updatedData);
    set({
      ...updatedData,
      ...calculateDerived(updatedData),
    });
  },

  removeExpense: (id) => {
    const current = get();

    const updatedData: PersistedData = {
      monthlyBudget: current.monthlyBudget,
      salaryDay: current.salaryDay,
      currency: current.currency,
      fixedExpenses: current.fixedExpenses,
      recentExpenses: current.recentExpenses.filter((item) => item.id !== id),
      trackingStartedAt: current.trackingStartedAt,
    };

    saveData(updatedData);
    set({
      ...updatedData,
      ...calculateDerived(updatedData),
    });
  },

  addFixedExpense: (name, amount) => {
    const current = get();

    const updatedData: PersistedData = {
      monthlyBudget: current.monthlyBudget,
      salaryDay: current.salaryDay,
      currency: current.currency,
      fixedExpenses: [
        ...current.fixedExpenses,
        {
          id: crypto.randomUUID(),
          name,
          amount: roundMoney(amount),
        },
      ],
      recentExpenses: current.recentExpenses,
      trackingStartedAt: current.trackingStartedAt,
    };

    saveData(updatedData);
    set({
      ...updatedData,
      ...calculateDerived(updatedData),
    });
  },

  updateFixedExpense: (id, name, amount) => {
    const current = get();

    const updatedData: PersistedData = {
      monthlyBudget: current.monthlyBudget,
      salaryDay: current.salaryDay,
      currency: current.currency,
      fixedExpenses: current.fixedExpenses.map((item) =>
        item.id === id
          ? {
              ...item,
              name,
              amount: roundMoney(amount),
            }
          : item
      ),
      recentExpenses: current.recentExpenses,
      trackingStartedAt: current.trackingStartedAt,
    };

    saveData(updatedData);
    set({
      ...updatedData,
      ...calculateDerived(updatedData),
    });
  },

  removeFixedExpense: (id) => {
    const current = get();

    const updatedData: PersistedData = {
      monthlyBudget: current.monthlyBudget,
      salaryDay: current.salaryDay,
      currency: current.currency,
      fixedExpenses: current.fixedExpenses.filter((item) => item.id !== id),
      recentExpenses: current.recentExpenses,
      trackingStartedAt: current.trackingStartedAt,
    };

    saveData(updatedData);
    set({
      ...updatedData,
      ...calculateDerived(updatedData),
    });
  },

    updateSettings: (monthlyBudget, salaryDay, currency) => {
    const current = get();

    const updatedData: PersistedData = {
      monthlyBudget: roundMoney(monthlyBudget),
      salaryDay,
      currency,
      fixedExpenses: current.fixedExpenses,
      recentExpenses: current.recentExpenses,
      trackingStartedAt: startOfToday().toISOString(),
    };

    saveData(updatedData);
    set({
      ...updatedData,
      ...calculateDerived(updatedData),
    });
  },

  restoreSettings: (snapshot) => {
    const current = get();

    const restoredData: PersistedData = {
      monthlyBudget: roundMoney(snapshot.monthlyBudget),
      salaryDay: snapshot.salaryDay,
      currency: snapshot.currency,
      fixedExpenses: current.fixedExpenses,
      recentExpenses: current.recentExpenses,
      trackingStartedAt: snapshot.trackingStartedAt,
    };

    saveData(restoredData);
    set({
      ...restoredData,
      ...calculateDerived(restoredData),
    });
  },

  refreshDerived: () => {
    const current = get();

    const currentData: PersistedData = {
      monthlyBudget: current.monthlyBudget,
      salaryDay: current.salaryDay,
      currency: current.currency,
      fixedExpenses: current.fixedExpenses,
      recentExpenses: current.recentExpenses,
      trackingStartedAt: current.trackingStartedAt,
    };

    set({
      ...currentData,
      ...calculateDerived(currentData),
    });
  },
}));