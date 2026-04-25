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
      monthlyBudget: current.monthlyBudget,
      salaryDay: current.salaryDay,
      currency: current.currency,
      fixedExpenses: current.fixedExpenses,
      recentExpenses: current.recentExpenses,
      trackingStartedAt: current.trackingStartedAt,
      expenseCategories: [...current.expenseCategories, newCategory],
    };

    localStorageFinanceRepository.save(updatedData);

    set({
      ...updatedData,
      ...calculateFinance(updatedData),
    });
  },

  addExpense: (amount, category) => {
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
          createdAt: new Date().toISOString(),
        },
        ...current.recentExpenses,
      ],
      trackingStartedAt: current.trackingStartedAt,
      expenseCategories: current.expenseCategories,
    };

    localStorageFinanceRepository.save(updatedData);

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
      expenseCategories: current.expenseCategories,
    };

    localStorageFinanceRepository.save(updatedData);

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
      expenseCategories: current.expenseCategories,
    };

    localStorageFinanceRepository.save(updatedData);

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
      expenseCategories: current.expenseCategories,
    };

    localStorageFinanceRepository.save(updatedData);

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
      expenseCategories: current.expenseCategories,
    };

    localStorageFinanceRepository.save(updatedData);

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
      expenseCategories: current.expenseCategories,
    };

    localStorageFinanceRepository.save(updatedData);

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
      expenseCategories: current.expenseCategories,
    };

    localStorageFinanceRepository.save(restoredData);

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
      expenseCategories: current.expenseCategories,
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
      trackingStartedAt: startOfToday().toISOString(),
      expenseCategories: current.expenseCategories,
    };

    localStorageFinanceRepository.save(updatedData);

    set({
      ...updatedData,
      ...calculateFinance(updatedData),
    });
  },
}));