import { create } from "zustand";

type ExpenseCategory = "food" | "other";

type Expense = {
  id: string;
  amount: number;
  category: ExpenseCategory;
  note?: string;
  createdAt: string;
};

type FixedExpense = {
  id: string;
  name: string;
  amount: number;
};

type Status = "green" | "yellow" | "red";

type FinanceStore = {
  monthlyBudget: number;
  salaryDay: number;
  fixedExpenses: FixedExpense[];
  recentExpenses: Expense[];
  remaining: number;
  daysLeft: number;
  dailyBudget: number;
  spentToday: number;
  savings: number;
  fixedTotal: number;
  totalSpentCore: number;
  nextSalaryDate: Date;
  status: Status;
  addExpense: (amount: number, category: ExpenseCategory, note?: string) => void;
  removeExpense: (id: string) => void;
  addFixedExpense: (name: string, amount: number) => void;
  updateFixedExpense: (id: string, name: string, amount: number) => void;
  removeFixedExpense: (id: string) => void;
  updateSettings: (monthlyBudget: number, salaryDay: number) => void;
  refreshDerived: () => void;
};

const STORAGE_KEY = "until-payday-finance";
const DAY_MS = 1000 * 60 * 60 * 24;

type PersistedData = {
  monthlyBudget: number;
  salaryDay: number;
  fixedExpenses: FixedExpense[];
  recentExpenses: Expense[];
  trackingStartedAt: string;
};

function roundMoney(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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

function isExpenseInCurrentCycle(
  expense: Expense,
  previousSalaryDate: Date,
  nextSalaryDate: Date
) {
  const expenseDate = new Date(expense.createdAt).getTime();

  return (
    expenseDate >= startOfDay(previousSalaryDate).getTime() &&
    expenseDate < startOfDay(nextSalaryDate).getTime()
  );
}

function calculateDerived(data: PersistedData) {
  const today = startOfToday();
  const nextSalaryDate = getNextSalaryDate(data.salaryDay);
  const previousSalaryDate = getPreviousSalaryDate(data.salaryDay);
  const daysLeft = getDaysLeft(nextSalaryDate);

  const trackingStartedAtDate = startOfDay(new Date(data.trackingStartedAt));
  const effectiveTrackingStart =
    trackingStartedAtDate > previousSalaryDate
      ? trackingStartedAtDate
      : previousSalaryDate;

  const cycleExpenses = data.recentExpenses.filter((expense) =>
    isExpenseInCurrentCycle(expense, previousSalaryDate, nextSalaryDate)
  );

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
  let currentCursor = startOfDay(previousSalaryDate);

  while (currentCursor < effectiveTrackingStart) {
    const dayKey = toDayKey(currentCursor);
    const spentThisDay = expensesByDay.get(dayKey) ?? 0;
    budgetAtStartOfDay -= spentThisDay;
    currentCursor = new Date(currentCursor.getTime() + DAY_MS);
  }

  let carryoverFromPastDays = 0;
  let todayBudget = 0;

  while (currentCursor <= today && currentCursor < nextSalaryDate) {
    const dayKey = toDayKey(currentCursor);
    const spentThisDay = expensesByDay.get(dayKey) ?? 0;
    const isToday = toDayKey(currentCursor) === toDayKey(today);

    const daysRemainingIncludingThisDay = Math.max(
      1,
      daysBetween(currentCursor, nextSalaryDate)
    );

    const plannedForThisDay = budgetAtStartOfDay / daysRemainingIncludingThisDay;

    if (isToday) {
      todayBudget = plannedForThisDay;
    } else {
      carryoverFromPastDays += plannedForThisDay - spentThisDay;
    }

    budgetAtStartOfDay -= spentThisDay;
    currentCursor = new Date(currentCursor.getTime() + DAY_MS);
  }

  const todayRemaining = todayBudget - spentToday;

  const savings =
    carryoverFromPastDays + (todayRemaining < 0 ? todayRemaining : 0);

  let status: Status = "green";

  if (remaining < -0.01) {
    status = "red";
  } else if (todayRemaining < -0.01 || savings < -0.01) {
    status = "yellow";
  }

  return {
    remaining: roundMoney(remaining),
    daysLeft,
    dailyBudget: roundMoney(todayBudget),
    spentToday: roundMoney(spentToday),
    savings: roundMoney(savings),
    fixedTotal: roundMoney(fixedTotal),
    totalSpentCore: roundMoney(totalSpentCore),
    nextSalaryDate,
    status,
  };
}

function loadInitialData(): PersistedData {
  const fallback: PersistedData = {
    monthlyBudget: 0,
    salaryDay: 25,
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
      trackingStartedAt:
        "trackingStartedAt" in current && typeof current.trackingStartedAt === "string"
          ? current.trackingStartedAt
          : startOfToday().toISOString(),
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
      fixedExpenses: current.fixedExpenses,
      recentExpenses: current.recentExpenses.filter((item) => item.id !== id),
      trackingStartedAt:
        "trackingStartedAt" in current && typeof current.trackingStartedAt === "string"
          ? current.trackingStartedAt
          : startOfToday().toISOString(),
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
      fixedExpenses: [
        ...current.fixedExpenses,
        {
          id: crypto.randomUUID(),
          name,
          amount: roundMoney(amount),
        },
      ],
      recentExpenses: current.recentExpenses,
      trackingStartedAt:
        "trackingStartedAt" in current && typeof current.trackingStartedAt === "string"
          ? current.trackingStartedAt
          : startOfToday().toISOString(),
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
      trackingStartedAt:
        "trackingStartedAt" in current && typeof current.trackingStartedAt === "string"
          ? current.trackingStartedAt
          : startOfToday().toISOString(),
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
      fixedExpenses: current.fixedExpenses.filter((item) => item.id !== id),
      recentExpenses: current.recentExpenses,
      trackingStartedAt:
        "trackingStartedAt" in current && typeof current.trackingStartedAt === "string"
          ? current.trackingStartedAt
          : startOfToday().toISOString(),
    };

    saveData(updatedData);
    set({
      ...updatedData,
      ...calculateDerived(updatedData),
    });
  },

  updateSettings: (monthlyBudget, salaryDay) => {
    const current = get();

    const updatedData: PersistedData = {
      monthlyBudget: roundMoney(monthlyBudget),
      salaryDay,
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

  refreshDerived: () => {
    const current = get();

    const currentData: PersistedData = {
      monthlyBudget: current.monthlyBudget,
      salaryDay: current.salaryDay,
      fixedExpenses: current.fixedExpenses,
      recentExpenses: current.recentExpenses,
      trackingStartedAt:
        "trackingStartedAt" in current && typeof current.trackingStartedAt === "string"
          ? current.trackingStartedAt
          : startOfToday().toISOString(),
    };

    set({
      ...currentData,
      ...calculateDerived(currentData),
    });
  },
}));