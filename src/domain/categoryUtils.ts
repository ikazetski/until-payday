import { DEFAULT_EXPENSE_CATEGORIES } from "@/domain/financeDefaults";
import type { ExpenseCategoryItem } from "@/domain/financeTypes";

export const MAX_ACTIVE_EXPENSE_CATEGORIES = 10;
export const ALWAYS_ACTIVE_CATEGORY_ID = "other";

function normalizeCategoryName(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeExpenseCategories(
  categories: ExpenseCategoryItem[] | undefined
): ExpenseCategoryItem[] {
  const source = Array.isArray(categories) && categories.length > 0
    ? categories
    : DEFAULT_EXPENSE_CATEGORIES;

  const byId = new Map<string, ExpenseCategoryItem>();

  for (const category of DEFAULT_EXPENSE_CATEGORIES) {
    byId.set(category.id, {
      ...category,
      hidden: category.id === ALWAYS_ACTIVE_CATEGORY_ID ? false : category.hidden ?? false,
      order: category.order ?? byId.size,
    });
  }

  for (const category of source) {
    if (!category?.id || !category?.name) continue;

    const existing = byId.get(category.id);

    byId.set(category.id, {
      ...existing,
      ...category,
      name: category.name.trim(),
      system: category.system ?? existing?.system ?? false,
      hidden:
        category.id === ALWAYS_ACTIVE_CATEGORY_ID
          ? false
          : category.hidden ?? existing?.hidden ?? false,
      order: category.order ?? existing?.order ?? byId.size,
    });
  }

  return Array.from(byId.values()).sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
}

export function getActiveExpenseCategories(
  categories: ExpenseCategoryItem[]
): ExpenseCategoryItem[] {
  return normalizeExpenseCategories(categories)
    .filter((category) => !category.hidden)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function getHiddenExpenseCategories(
  categories: ExpenseCategoryItem[]
): ExpenseCategoryItem[] {
  return normalizeExpenseCategories(categories)
    .filter((category) => category.hidden)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function hasReachedActiveCategoryLimit(
  categories: ExpenseCategoryItem[]
): boolean {
  return getActiveExpenseCategories(categories).length >= MAX_ACTIVE_EXPENSE_CATEGORIES;
}

export function hasCategoryName(
  categories: ExpenseCategoryItem[],
  name: string,
  exceptCategoryId?: string
): boolean {
  const normalizedName = normalizeCategoryName(name);

  return categories.some((category) => {
    if (exceptCategoryId && category.id === exceptCategoryId) return false;
    return normalizeCategoryName(category.name) === normalizedName;
  });
}