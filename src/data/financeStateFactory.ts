import { startOfDay } from "@/lib/finance";
import {
  DEFAULT_CURRENCY,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_MONTHLY_BUDGET,
  DEFAULT_SALARY_DAY,
} from "@/domain/financeDefaults";
import type { PersistedFinanceState } from "@/data/financeRepository";

function startOfToday() {
  return startOfDay(new Date());
}

export function createFallbackFinanceState(): PersistedFinanceState {
  return {
    monthlyBudget: DEFAULT_MONTHLY_BUDGET,
    salaryDay: DEFAULT_SALARY_DAY,
    currency: DEFAULT_CURRENCY,
    fixedExpenses: [],
    recentExpenses: [],
    trackingStartedAt: startOfToday().toISOString(),
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
  };
}