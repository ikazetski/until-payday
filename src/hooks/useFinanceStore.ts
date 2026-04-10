import { create } from "zustand";
import {
  roundMoney,
  startOfDay,
} from "@/lib/finance";
import { calculateFinance } from "@/domain/financeEngine";

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
  startNewCycle: () => void;
};

const STORAGE_KEY = "until-payday-finance";

function startOfToday() {
  return startOfDay(new Date());
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
const initialDerived = calculateFinance(initialData);

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
      ...calculateFinance(updatedData),
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
      ...calculateFinance(updatedData),
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
      ...calculateFinance(updatedData),
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
      ...calculateFinance(updatedData),
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
      ...calculateFinance(updatedData),
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
    trackingStartedAt: current.trackingStartedAt,
  };

  saveData(updatedData);
  set({
    ...updatedData,
    ...calculateFinance(updatedData),
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
      ...calculateFinance(restoredData),
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
      ...calculateFinance(currentData),
    });
  },

  startNewCycle: () => {
    const current = get();

    const updatedData: PersistedData = {
      monthlyBudget: current.monthlyBudget,
      salaryDay: current.salaryDay,
      currency: current.currency,
      fixedExpenses: current.fixedExpenses,
      recentExpenses: current.recentExpenses,
      trackingStartedAt: startOfDay(new Date()).toISOString(),
    };

    saveData(updatedData);

    set({
      ...updatedData,
      ...calculateFinance(updatedData),
    });
  },
}));