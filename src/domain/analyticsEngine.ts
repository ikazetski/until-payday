import type { Expense, ExpenseCategoryItem } from "@/hooks/useFinanceStore";

export type AnalyticsRange = "week" | "period";

export type AnalyticsCategoryItem = {
  id: string;
  name: string;
  amount: number;
  transactions: number;
  share: number;
  color: string;
};

export type AnalyticsSummary = {
  totalAmount: number;
  top3Share: number;
  topCategoryName: string | null;
  categories: AnalyticsCategoryItem[];
  chartCategories: AnalyticsCategoryItem[];
};

const CATEGORY_COLORS = [
  "#FF6B6B", // coral
  "#A855F7", // violet
  "#38BDF8", // sky
  "#FB923C", // orange
  "#14B8A6", // teal
  "#F472B6", // pink
];

function round1(value: number) {
  return Number(value.toFixed(1));
}

export function buildAnalyticsSummary(params: {
  expenses: Expense[];
  categories: ExpenseCategoryItem[];
}): AnalyticsSummary {
  const { expenses, categories } = params;

  const categoryMap = new Map(
    categories.map((category) => [category.id, category.name])
  );

  const grouped = new Map<
    string,
    {
      id: string;
      name: string;
      amount: number;
      transactions: number;
    }
  >();

  for (const expense of expenses) {
    const id = expense.category;
    const name = categoryMap.get(id) ?? "Без категории";

    const existing = grouped.get(id);

    if (existing) {
      existing.amount += expense.amount;
      existing.transactions += 1;
    } else {
      grouped.set(id, {
        id,
        name,
        amount: expense.amount,
        transactions: 1,
      });
    }
  }

  const totalAmount = Array.from(grouped.values()).reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const categoriesSorted = Array.from(grouped.values())
    .sort((a, b) => b.amount - a.amount)
    .map((item, index) => ({
      ...item,
      share: totalAmount > 0 ? round1((item.amount / totalAmount) * 100) : 0,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));

  const top3Share = categoriesSorted
    .slice(0, 3)
    .reduce((sum, item) => sum + item.share, 0);

  let chartCategories = categoriesSorted;

  if (categoriesSorted.length > 6) {
    const top5 = categoriesSorted.slice(0, 5);
    const rest = categoriesSorted.slice(5);

    const restAmount = rest.reduce((sum, item) => sum + item.amount, 0);
    const restTransactions = rest.reduce((sum, item) => sum + item.transactions, 0);
    const restShare = rest.reduce((sum, item) => sum + item.share, 0);

    chartCategories = [
      ...top5,
      {
        id: "other_aggregated",
        name: "Остальное",
        amount: restAmount,
        transactions: restTransactions,
        share: round1(restShare),
        color: "#94A3B8",
      },
    ];
  }

  return {
    totalAmount,
    top3Share: round1(top3Share),
    topCategoryName: categoriesSorted[0]?.name ?? null,
    categories: categoriesSorted,
    chartCategories,
  };
}