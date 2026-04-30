import { create } from "zustand";
import { roundMoney, startOfDay } from "@/lib/finance";
import { calculateFinance } from "@/domain/financeEngine";

import {
  bootstrapFinanceStorage,
  persistFinanceState,
  type FinanceStorageSource,
} from "@/data/financeStorageBootstrap";
import { createFallbackFinanceState } from "@/data/financeStateFactory";
import type { PersistedFinanceState } from "@/data/financeRepository";

import type {
  CurrencyCode,
  Expense,
  ExpenseCategory,
  ExpenseCategoryItem,
  FixedExpense,
} from "@/domain/financeTypes";

import {
  ALWAYS_ACTIVE_CATEGORY_ID,
  MAX_ACTIVE_EXPENSE_CATEGORIES,
  getActiveExpenseCategories,
  hasCategoryName,
  normalizeExpenseCategories,
} from "@/domain/categoryUtils";

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

  isHydrated: boolean;
  storageSource: FinanceStorageSource | "loading" | "error";

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
  hideExpenseCategory: (id: string) => boolean;
  restoreExpenseCategory: (id: string) => boolean;
  renameExpenseCategory: (id: string, name: string) => boolean;
  moveExpenseCategoryUp: (id: string) => void;
  moveExpenseCategoryDown: (id: string) => void;

  addExpense: (amount: number, category: ExpenseCategory) => void;
  removeExpense: (id: string) => void;

  addFixedExpense: (name: string, amount: number) => void;
  updateFixedExpense: (id: string, name: string, amount: number) => void;
  removeFixedExpense: (id: string) => void;

  updateSettings: (
    monthlyBudget: number,
    salaryDay: number,
    currency: CurrencyCode,
  ) => void;
  restoreSettings: (snapshot: SettingsSnapshot) => void;

  refreshDerived: () => void;
  startNewCycle: () => void;

  hydrate: () => Promise<void>;
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
  persistFinanceState(data);

  return {
    ...data,
    ...calculateFinance(data),
  };
}

function getNextCategoryOrder(categories: ExpenseCategoryItem[]) {
  const orders = categories
    .map((category) => category.order)
    .filter((order): order is number => typeof order === "number");

  return orders.length === 0 ? 0 : Math.max(...orders) + 1;
}

function sortCategoriesByOrder(categories: ExpenseCategoryItem[]) {
  return [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function reorderCategories(categories: ExpenseCategoryItem[]) {
  return sortCategoriesByOrder(categories).map((category, index) => ({
    ...category,
    order: index,
  }));
}

function moveCategory(
  categories: ExpenseCategoryItem[],
  categoryId: string,
  direction: "up" | "down",
) {
  const normalized = reorderCategories(categories);
  const activeCategories = normalized.filter((category) => !category.hidden);
  const activeIndex = activeCategories.findIndex(
    (category) => category.id === categoryId,
  );

  if (activeIndex === -1) return normalized;

  const targetIndex = direction === "up" ? activeIndex - 1 : activeIndex + 1;

  if (targetIndex < 0 || targetIndex >= activeCategories.length) {
    return normalized;
  }

  const currentCategory = activeCategories[activeIndex];
  const targetCategory = activeCategories[targetIndex];

  return reorderCategories(
    normalized.map((category) => {
      if (category.id === currentCategory.id) {
        return {
          ...category,
          order: targetCategory.order,
        };
      }

      if (category.id === targetCategory.id) {
        return {
          ...category,
          order: currentCategory.order,
        };
      }

      return category;
    }),
  );
}

const initialData = createFallbackFinanceState();
const initialDerived = calculateFinance(initialData);

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  ...initialData,
  ...initialDerived,
  isHydrated: false,
  storageSource: "loading",

  hydrate: async () => {
    try {
      const result = await bootstrapFinanceStorage();

      set({
        ...result.state,
        ...calculateFinance(result.state),
        isHydrated: true,
        storageSource: result.source,
      });
    } catch (error) {
      console.error("Failed to hydrate finance storage", error);

      const currentData = selectPersistedData(get());

      set({
        ...currentData,
        ...calculateFinance(currentData),
        isHydrated: true,
        storageSource: "error",
      });
    }
  },

  addExpenseCategory: (name: string) => {
    const current = get();
    const trimmed = name.trim();

    if (!trimmed) return;
    if (trimmed.length > 12) return;

    const normalizedCategories = normalizeExpenseCategories(
      current.expenseCategories,
    );

    if (hasCategoryName(normalizedCategories, trimmed)) return;

    const activeCategories = getActiveExpenseCategories(normalizedCategories);

    if (activeCategories.length >= MAX_ACTIVE_EXPENSE_CATEGORIES) return;

    const newCategory: ExpenseCategoryItem = {
      id: `custom_${crypto.randomUUID()}`,
      name: trimmed,
      system: false,
      hidden: false,
      order: getNextCategoryOrder(normalizedCategories),
    };

    const updatedData: PersistedData = {
      ...selectPersistedData(current),
      expenseCategories: reorderCategories([
        ...normalizedCategories,
        newCategory,
      ]),
    };

    set(persistAndRecalculate(updatedData));
  },

  hideExpenseCategory: (id: string) => {
    if (id === ALWAYS_ACTIVE_CATEGORY_ID) return false;

    const current = get();
    const normalizedCategories = normalizeExpenseCategories(
      current.expenseCategories,
    );

    const exists = normalizedCategories.some((category) => category.id === id);
    if (!exists) return false;

    const updatedCategories = reorderCategories(
      normalizedCategories.map((category) =>
        category.id === id
          ? {
              ...category,
              hidden: true,
            }
          : category,
      ),
    );

    const updatedData: PersistedData = {
      ...selectPersistedData(current),
      expenseCategories: updatedCategories,
    };

    set(persistAndRecalculate(updatedData));
    return true;
  },

  restoreExpenseCategory: (id: string) => {
    const current = get();
    const normalizedCategories = normalizeExpenseCategories(
      current.expenseCategories,
    );

    const targetCategory = normalizedCategories.find(
      (category) => category.id === id,
    );

    if (!targetCategory) return false;
    if (!targetCategory.hidden) return true;

    const activeCategories = getActiveExpenseCategories(normalizedCategories);

    if (activeCategories.length >= MAX_ACTIVE_EXPENSE_CATEGORIES) {
      return false;
    }

    const updatedCategories = reorderCategories(
      normalizedCategories.map((category) =>
        category.id === id
          ? {
              ...category,
              hidden: false,
              order: getNextCategoryOrder(normalizedCategories),
            }
          : category,
      ),
    );

    const updatedData: PersistedData = {
      ...selectPersistedData(current),
      expenseCategories: updatedCategories,
    };

    set(persistAndRecalculate(updatedData));
    return true;
  },

  renameExpenseCategory: (id: string, name: string) => {
    if (id === ALWAYS_ACTIVE_CATEGORY_ID) return false;

    const current = get();
    const trimmed = name.trim();

    if (!trimmed) return false;
    if (trimmed.length > 12) return false;

    const normalizedCategories = normalizeExpenseCategories(
      current.expenseCategories,
    );

    const targetCategory = normalizedCategories.find(
      (category) => category.id === id,
    );

    if (!targetCategory) return false;
    if (targetCategory.system) return false;
    if (hasCategoryName(normalizedCategories, trimmed, id)) return false;

    const updatedCategories = normalizedCategories.map((category) =>
      category.id === id
        ? {
            ...category,
            name: trimmed,
          }
        : category,
    );

    const updatedData: PersistedData = {
      ...selectPersistedData(current),
      expenseCategories: reorderCategories(updatedCategories),
    };

    set(persistAndRecalculate(updatedData));
    return true;
  },

  moveExpenseCategoryUp: (id: string) => {
    const current = get();

    const updatedData: PersistedData = {
      ...selectPersistedData(current),
      expenseCategories: moveCategory(current.expenseCategories, id, "up"),
    };

    set(persistAndRecalculate(updatedData));
  },

  moveExpenseCategoryDown: (id: string) => {
    const current = get();

    const updatedData: PersistedData = {
      ...selectPersistedData(current),
      expenseCategories: moveCategory(current.expenseCategories, id, "down"),
    };

    set(persistAndRecalculate(updatedData));
  },

  addExpense: (amount, category) => {
    const current = get();

    const categoryName =
      current.expenseCategories.find((item) => item.id === category)?.name ??
      "Другое";

    const updatedData: PersistedData = {
      ...selectPersistedData(current),
      recentExpenses: [
        {
          id: crypto.randomUUID(),
          amount: roundMoney(amount),
          category,
          categoryNameSnapshot: categoryName,
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
          : item,
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
