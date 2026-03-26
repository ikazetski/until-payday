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
};

function roundMoney(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysBetween(start: Date, end: Date) {
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS));
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

function calculateDerived(data: PersistedData) {
  const today = startOfToday();
  const nextSalaryDate = getNextSalaryDate(data.salaryDay);
  const previousSalaryDate = getPreviousSalaryDate(data.salaryDay);

  const daysLeft = getDaysLeft(nextSalaryDate);
  const cycleDays = Math.max(1, daysBetween(previousSalaryDate, nextSalaryDate));
  const elapsedDays = Math.min(cycleDays, daysBetween(previousSalaryDate, today));

  const totalSpentCore = data.recentExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const fixedTotal = data.fixedExpenses.reduce((sum, item) => sum + item.amount, 0);
  const remaining = data.monthlyBudget - totalSpentCore;
  const dailyBudget = daysLeft > 0 ? remaining / daysLeft : remaining;

  const spentToday = data.recentExpenses
    .filter((expense) => isSameDay(expense.createdAt, today))
    .reduce((sum, expense) => sum + expense.amount, 0);

  const idealSpentByNow = (data.monthlyBudget / cycleDays) * elapsedDays;
  const savings = idealSpentByNow - totalSpentCore;
  const todayRemaining = dailyBudget - spentToday;

  let status: Status = "green";
  if (todayRemaining < 0 || savings < -0.01) {
    status = "red";
  } else if (todayRemaining <= dailyBudget * 0.15 || savings < 10) {
    status = "yellow";
  }

  return {
    remaining: roundMoney(remaining),
    daysLeft,
    dailyBudget: roundMoney(dailyBudget),
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
    monthlyBudget: 1000,
    salaryDay: 25,
    fixedExpenses: [],
    recentExpenses: [],
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
        typeof parsed.salaryDay === "number" ? parsed.salaryDay : fallback.salaryDay,
      fixedExpenses: Array.isArray(parsed.fixedExpenses)
        ? parsed.fixedExpenses
        : fallback.fixedExpenses,
      recentExpenses: Array.isArray(parsed.recentExpenses)
        ? parsed.recentExpenses
        : fallback.recentExpenses,
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
    };

    set({
      ...currentData,
      ...calculateDerived(currentData),
    });
  },
}));