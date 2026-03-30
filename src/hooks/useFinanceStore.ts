import { create } from "zustand";

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

function roundMoney(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfToday() {
  return startOfDay(new Date());
}

function toDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function daysBetween(start: Date, end: Date) {
  const startDate = startOfDay(start);
  const endDate = startOfDay(end);

  return Math.max(
    0,
    Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS)
  );
}

function countInclusiveDays(start: Date, end: Date) {
  const startDate = startOfDay(start);
  const endDate = startOfDay(end);

  if (startDate.getTime() > endDate.getTime()) {
    return 0;
  }

  return Math.floor((endDate.getTime() - startDate.getTime()) / DAY_MS) + 1;
}

function getSafeDay(year: number, month: number, salaryDay: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(Math.max(salaryDay, 1), daysInMonth);
}

function getNextSalaryDate(salaryDay: number) {
  const today = startOfToday();
  const year = today.getFullYear();
  const month = today.getMonth();

  const thisMonthDate = new Date(year, month, getSafeDay(year, month, salaryDay));

  if (thisMonthDate > today) {
    return thisMonthDate;
  }

  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonth = (month + 1) % 12;

  return new Date(
    nextMonthYear,
    nextMonth,
    getSafeDay(nextMonthYear, nextMonth, salaryDay)
  );
}

function getPreviousSalaryDate(salaryDay: number) {
  const today = startOfToday();
  const year = today.getFullYear();
  const month = today.getMonth();

  const thisMonthDate = new Date(year, month, getSafeDay(year, month, salaryDay));

  if (thisMonthDate <= today) {
    return thisMonthDate;
  }

  const prevMonthYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;

  return new Date(
    prevMonthYear,
    prevMonth,
    getSafeDay(prevMonthYear, prevMonth, salaryDay)
  );
}

function getDaysLeft(nextSalaryDate: Date) {
  const today = startOfToday();
  const diffMs = nextSalaryDate.getTime() - today.getTime();
  const days = Math.ceil(diffMs / DAY_MS);

  return Math.max(days, 1);
}

function isSameDay(dateString: string, compareDate: Date) {
  const date = new Date(dateString);

  return (
    date.getFullYear() === compareDate.getFullYear() &&
    date.getMonth() === compareDate.getMonth() &&
    date.getDate() === compareDate.getDate()
  );
}

function getWeekStart(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  return startOfDay(
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff)
  );
}

function getWeekEnd(date: Date) {
  const weekStart = getWeekStart(date);

  return startOfDay(
    new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + 6
    )
  );
}

function getMaxDate(a: Date, b: Date) {
  return a.getTime() >= b.getTime() ? a : b;
}

function getMinDate(a: Date, b: Date) {
  return a.getTime() <= b.getTime() ? a : b;
}

function calculateDerived(data: PersistedData) {
  const today = startOfToday();
  const nextSalaryDate = getNextSalaryDate(data.salaryDay);
  const previousSalaryDate = getPreviousSalaryDate(data.salaryDay);
  const daysLeft = getDaysLeft(nextSalaryDate);

  const trackingStartedAtDate = startOfDay(new Date(data.trackingStartedAt));
  const effectiveTrackingStart = getMaxDate(
    trackingStartedAtDate,
    previousSalaryDate
  );

  const currentCycleStart = effectiveTrackingStart;

  const currentWeekStart = getWeekStart(today);
  const currentWeekEnd = getWeekEnd(today);

  const cycleStartMs = currentCycleStart.getTime();
  const cycleEndMs = startOfDay(nextSalaryDate).getTime();

  const cycleExpenses = data.recentExpenses.filter((expense) => {
    const expenseDate = new Date(expense.createdAt).getTime();

    return expenseDate >= cycleStartMs && expenseDate < cycleEndMs;
  });

  const totalSpentCore = cycleExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const fixedTotal = data.fixedExpenses.reduce((sum, item) => sum + item.amount, 0);
  const remaining = data.monthlyBudget - totalSpentCore;

  const expensesByDay = new Map<string, number>();

  for (const expense of cycleExpenses) {
    const key = toDayKey(new Date(expense.createdAt));
    expensesByDay.set(key, roundMoney((expensesByDay.get(key) ?? 0) + expense.amount));
  }

    const spentToday = cycleExpenses
    .filter((expense) => isSameDay(expense.createdAt, today))
    .reduce((sum, expense) => sum + expense.amount, 0);

    let budgetAtStartOfDay = data.monthlyBudget;
  let cursor = startOfDay(effectiveTrackingStart);
  let dailyBudget = 0;
  let monthlyCarryover = 0;
  let weeklyCarryover = 0;

  let weeklyBudget = 0;
  let weeklySpent = 0;

  const lastWeekDayInCycle = getMinDate(
    currentWeekEnd,
    startOfDay(
      new Date(
        nextSalaryDate.getFullYear(),
        nextSalaryDate.getMonth(),
        nextSalaryDate.getDate() - 1
      )
    )
  );

  const effectiveWeekStart = getMaxDate(currentWeekStart, effectiveTrackingStart);
  const weekDaysInScope = countInclusiveDays(
    effectiveWeekStart,
    lastWeekDayInCycle
  );

  while (cursor <= today) {
    const daysRemainingInCycle = Math.max(1, daysBetween(cursor, nextSalaryDate));
    const plannedForDay = budgetAtStartOfDay / daysRemainingInCycle;
    const spentThisDay = expensesByDay.get(toDayKey(cursor)) ?? 0;

    const isTodayCursor = toDayKey(cursor) === toDayKey(today);
    const isPastDay = cursor.getTime() < today.getTime();

    if (isTodayCursor) {
      dailyBudget = plannedForDay;
    }

    if (isPastDay) {
      const diff = plannedForDay - spentThisDay;
      monthlyCarryover += diff;
    } else {
      monthlyCarryover += Math.min(0, plannedForDay - spentThisDay);
    }

    const isCurrentWeekDay =
      cursor.getTime() >= effectiveWeekStart.getTime() &&
      cursor.getTime() <= today.getTime();

    if (isCurrentWeekDay) {
      weeklySpent += spentThisDay;

      if (isPastDay) {
        weeklyCarryover += plannedForDay - spentThisDay;
      } else {
        weeklyCarryover += Math.min(0, plannedForDay - spentThisDay);
      }
    }

    if (
      toDayKey(cursor) === toDayKey(effectiveWeekStart) &&
      weekDaysInScope > 0
    ) {
      weeklyBudget = plannedForDay * weekDaysInScope;
    }

    budgetAtStartOfDay -= spentThisDay;

    cursor = startOfDay(
      new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
    );
  }

  const weeklyRemaining = weeklyBudget - weeklySpent;

  const todayAvailable = Math.max(0, dailyBudget - spentToday);

  const weeklyDaysLeft = countInclusiveDays(today, lastWeekDayInCycle);

  const weeklyRemainingAtStartOfToday = weeklyRemaining + spentToday;

  const weeklyTodayBudget =
    weeklyDaysLeft > 0 ? weeklyRemainingAtStartOfToday / weeklyDaysLeft : 0;

  const weeklyTodayAvailable = Math.max(0, weeklyTodayBudget - spentToday);

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

  return {
    remaining: roundMoney(remaining),
    daysLeft,
    dailyBudget: roundMoney(dailyBudget),
    spentToday: roundMoney(spentToday),
    todayAvailable: roundMoney(todayAvailable),
    weeklyTodayAvailable: roundMoney(weeklyTodayAvailable),
    savings: roundMoney(monthlyCarryover),
    fixedTotal: roundMoney(fixedTotal),
    totalSpentCore: roundMoney(totalSpentCore),
    previousSalaryDate,
    currentCycleStart,
    nextSalaryDate,
    status,

    weeklyBudget: roundMoney(weeklyBudget),
    weeklyRemaining: roundMoney(weeklyRemaining),
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