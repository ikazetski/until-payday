import { create } from "zustand";
import { roundMoney, startOfDay } from "@/lib/finance";
import { calculateFinance } from "@/domain/financeEngine";

import { localStorageFinanceRepository } from "@/data/localStorageFinanceRepository";
import type { PersistedFinanceState } from "@/data/financeRepository";

import type {
  CurrencyCode,
  Expense,
  ExpenseCategory,
  ExpenseCategoryItem,
  FixedExpense,
} from "@/domain/financeTypes";

export type {
  CurrencyCode,
  Expense,
  ExpenseCategory,
  ExpenseCategoryItem,
  FixedExpense,
} from "@/domain/financeTypes";

type Status = "green" | "yellow" | "red";

type PersistedData = PersistedFinanceState;

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
  expenseCategories: ExpenseCategoryItem[];

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

  addExpenseCategory: (name: string) => void;

  addExpense: (amount: number, category: ExpenseCategory) => void;
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

function startOfToday() {
  return startOfDay(new Date());
}

function selectPersistedData(state: FinanceStore): PersistedData {
  return {
    monthlyBudget: state.monthlyBudget,
    salaryDay: state.salaryDay,
    currency: state.currency,
    fixedExpenses: state.fixedExpenses,
    recentExpenses: state.recentExpenses,
    trackingStartedAt: state.trackingStartedAt,
    expenseCategories: state.expenseCategories,
  };
}

function persistAndRecalculate(data: PersistedData) {
  localStorageFinanceRepository.save(data);

  return {
    ...data,
    ...calculateFinance(data),
  };
}

const initialData = localStorageFinanceRepository.load();
const initialDerived = calculateFinance(initialData);

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  ...initialData,
  ...initialDerived,

  addExpenseCategory: (name: string) => {
    const current = get();
    const trimmed = name.trim();

    if (!trimmed) return;
    if (trimmed.length > 12) return;

    const existsAlready = current.expenseCategories.some(
      (item) => item.name.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (existsAlready) return;

    const customCategoriesCount = current.expenseCategories.filter(
      (item) => !item.system
    ).length;

    if (customCategoriesCount >= 5) return;

    const newCategory: ExpenseCategoryItem = {
      id: `custom_${Date.now()}`,
      name: trimmed,
      system: false,
    };

    const updatedData: PersistedData = {
      ...selectPersistedData(current),
      expenseCategories: [...current.expenseCategories, newCategory],
    };

    set(persistAndRecalculate(updatedData));
  },

  addExpense: (amount, category) => {
    const current = get();

    const updatedData: PersistedData = {
      ...selectPersistedData(current),
      recentExpenses: [
        {
          id: crypto.randomUUID(),
          amount: roundMoney(amount),
          category,
          createdAt: new Date().toISOString(),
        },
        ...current.recentExpenses,
      ],
    };

    set(persistAndRecalculate(updatedData));
  },

  removeExpense: (id) => {
    const current = get();

    const updatedData: PersistedData = {
      ...selectPersistedData(current),
      recentExpenses: current.recentExpenses.filter((item) => item.id !== id),
    };

    set(persistAndRecalculate(updatedData));
  },

  addFixedExpense: (name, amount) => {
    const current = get();

    const updatedData: PersistedData = {
      ...selectPersistedData(current),
      fixedExpenses: [
        ...current.fixedExpenses,
        {
          id: crypto.randomUUID(),
          name,
          amount: roundMoney(amount),
        },
      ],
    };

    set(persistAndRecalculate(updatedData));
  },

  updateFixedExpense: (id, name, amount) => {
    const current = get();

    const updatedData: PersistedData = {
      ...selectPersistedData(current),
      fixedExpenses: current.fixedExpenses.map((item) =>
        item.id === id
          ? {
              ...item,
              name,
              amount: roundMoney(amount),
            }
          : item
      ),
    };

    set(persistAndRecalculate(updatedData));
  },

  removeFixedExpense: (id) => {
    const current = get();

    const updatedData: PersistedData = {
      ...selectPersistedData(current),
      fixedExpenses: current.fixedExpenses.filter((item) => item.id !== id),
    };

    set(persistAndRecalculate(updatedData));
  },

  updateSettings: (monthlyBudget, salaryDay, currency) => {
    const current = get();

    const updatedData: PersistedData = {
      ...selectPersistedData(current),
      monthlyBudget: roundMoney(monthlyBudget),
      salaryDay,
      currency,
    };

    set(persistAndRecalculate(updatedData));
  },

  restoreSettings: (snapshot) => {
    const current = get();

    const restoredData: PersistedData = {
      ...selectPersistedData(current),
      monthlyBudget: roundMoney(snapshot.monthlyBudget),
      salaryDay: snapshot.salaryDay,
      currency: snapshot.currency,
      trackingStartedAt: snapshot.trackingStartedAt,
    };

    set(persistAndRecalculate(restoredData));
  },

  refreshDerived: () => {
    const current = get();

    const currentData = selectPersistedData(current);

    set({
      ...currentData,
      ...calculateFinance(currentData),
    });
  },

  startNewCycle: () => {
    const current = get();

    const updatedData: PersistedData = {
      ...selectPersistedData(current),
      trackingStartedAt: startOfToday().toISOString(),
    };

    set(persistAndRecalculate(updatedData));
  },
}));