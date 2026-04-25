import type { ExpenseCategoryItem } from "@/domain/financeTypes";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/domain/financeDefaults";

export function normalizeExpenseCategories(
  value: unknown
): ExpenseCategoryItem[] {
  if (!Array.isArray(value)) {
    return DEFAULT_EXPENSE_CATEGORIES;
  }

  const normalized = value.filter(
    (item): item is ExpenseCategoryItem =>
      typeof item === "object" &&
      item !== null &&
      typeof item.id === "string" &&
      item.id.trim().length > 0 &&
      typeof item.name === "string" &&
      item.name.trim().length > 0
  );

  if (normalized.length === 0) {
    return DEFAULT_EXPENSE_CATEGORIES;
  }

  return normalized;
}