import type { Expense, ExpenseCategoryItem } from "@/hooks/useFinanceStore";

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

export type SpendingRhythmItem = {
  key: string;
  label: string;
  amount: number;
  isPeak: boolean;
};

export type SpendingRhythmSummary = {
  items: SpendingRhythmItem[];
  averageLabel: string;
  averageAmount: number;
  peakLabel: string | null;
  peakShare: number;
};

export type AnalyticsAdvice = {
  title: string;
  description: string;
  tone: "neutral" | "positive" | "warning";
};

const CATEGORY_COLORS = [
  "#FF6B6B",
  "#A855F7",
  "#38BDF8",
  "#FB923C",
  "#14B8A6",
  "#F472B6",
];

const DAY_LABELS = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

function round1(value: number) {
  return Number(value.toFixed(1));
}

function getMondayBasedDayIndex(dateInput: string | number | Date) {
  const day = new Date(dateInput).getDay();
  return day === 0 ? 6 : day - 1;
}

function startOfDayTs(dateInput: string | number | Date) {
  const date = new Date(dateInput);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatWeekRangeLabel(start: Date, end: Date) {
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()}`;
  }
  return `${start.getDate()}.${start.getMonth() + 1}–${end.getDate()}.${end.getMonth() + 1}`;
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

export function buildWeekSpendingRhythm(params: {
  expenses: Expense[];
}): SpendingRhythmSummary {
  const totals = new Array(7).fill(0);

  for (const expense of params.expenses) {
    const dayIndex = getMondayBasedDayIndex(expense.createdAt);
    totals[dayIndex] += expense.amount;
  }

  const totalAmount = totals.reduce((sum, value) => sum + value, 0);
  const maxAmount = Math.max(...totals, 0);
  const peakIndex = totals.findIndex((value) => value === maxAmount && value > 0);

  const items: SpendingRhythmItem[] = totals.map((amount, index) => ({
    key: `day-${index}`,
    label: DAY_LABELS[index],
    amount: round1(amount),
    isPeak: index === peakIndex && amount > 0,
  }));

  return {
    items,
    averageLabel: "в день",
    averageAmount: round1(totalAmount / 7),
    peakLabel: peakIndex >= 0 ? DAY_LABELS[peakIndex] : null,
    peakShare:
      totalAmount > 0 && peakIndex >= 0
        ? round1((totals[peakIndex] / totalAmount) * 100)
        : 0,
  };
}

export function buildPeriodSpendingRhythm(params: {
  expenses: Expense[];
  cycleStart: Date;
  nextSalaryDate: Date;
}): SpendingRhythmSummary {
  const cycleStartTs = startOfDayTs(params.cycleStart);
  const cycleEndTs = startOfDayTs(params.nextSalaryDate);

  const weekRanges: Array<{ start: Date; end: Date; amount: number }> = [];
  let cursor = new Date(cycleStartTs);

  while (cursor.getTime() < cycleEndTs) {
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setDate(end.getDate() + 6);

    if (end.getTime() >= cycleEndTs) {
      end.setTime(cycleEndTs - 1);
    }

    weekRanges.push({
      start,
      end,
      amount: 0,
    });

    cursor.setDate(cursor.getDate() + 7);
  }

  for (const expense of params.expenses) {
    const expenseTs = startOfDayTs(expense.createdAt);
    const bucket = weekRanges.find(
      (range) =>
        expenseTs >= startOfDayTs(range.start) &&
        expenseTs <= startOfDayTs(range.end)
    );

    if (bucket) {
      bucket.amount += expense.amount;
    }
  }

  const totalAmount = weekRanges.reduce((sum, item) => sum + item.amount, 0);
  const maxAmount = Math.max(...weekRanges.map((item) => item.amount), 0);
  const peakIndex = weekRanges.findIndex(
    (item) => item.amount === maxAmount && item.amount > 0
  );

  const items: SpendingRhythmItem[] = weekRanges.map((item, index) => ({
    key: `week-${index + 1}`,
    label: `Нед ${index + 1}`,
    amount: round1(item.amount),
    isPeak: index === peakIndex && item.amount > 0,
  }));

  return {
    items,
    averageLabel: "в неделю",
    averageAmount:
      weekRanges.length > 0 ? round1(totalAmount / weekRanges.length) : 0,
    peakLabel:
      peakIndex >= 0
        ? formatWeekRangeLabel(weekRanges[peakIndex].start, weekRanges[peakIndex].end)
        : null,
    peakShare:
      totalAmount > 0 && peakIndex >= 0
        ? round1((weekRanges[peakIndex].amount / totalAmount) * 100)
        : 0,
  };
}

export function buildAnalyticsAdvice(params: {
  periodDelta: number;
  summary: AnalyticsSummary;
  rhythm: {
    peakLabel: string | null;
    peakShare: number;
  };
}): AnalyticsAdvice {
  const { periodDelta, summary, rhythm } = params;

  if (summary.categories.length === 0) {
    return {
      title: "Совет",
      description: "Добавь несколько расходов, чтобы увидеть структуру трат и рекомендации.",
      tone: "neutral",
    };
  }

  const topCategory = summary.categories[0];
  const topCategoryShare = topCategory?.share ?? 0;

  if (periodDelta < 0 && topCategoryShare >= 35) {
    return {
      title: "Совет",
      description: `Сейчас есть перерасход. Начни с категории «${topCategory.name}» — она занимает ${topCategoryShare.toFixed(
        0
      )}% всех расходов и сильнее всего влияет на баланс.`,
      tone: "warning",
    };
  }

  if (periodDelta < 0 && summary.top3Share >= 75) {
    return {
      title: "Совет",
      description: `Траты сильно сконцентрированы: топ-3 категории уже занимают ${summary.top3Share.toFixed(
        0
      )}% всех расходов. Попробуй сократить хотя бы одну из них.`,
      tone: "warning",
    };
  }

  if (rhythm.peakLabel && rhythm.peakShare >= 35) {
    return {
      title: "Совет",
      description: `Самый активный период — ${rhythm.peakLabel}. На него приходится ${rhythm.peakShare.toFixed(
        0
      )}% расходов. Проверь, не возникает ли основной перерасход именно здесь.`,
      tone: "neutral",
    };
  }

  if (periodDelta >= 0 && summary.top3Share <= 70) {
    return {
      title: "Совет",
      description: "Расходы распределены достаточно ровно — баланс пока сохраняется без явного перекоса в одну категорию.",
      tone: "positive",
    };
  }

  return {
    title: "Совет",
    description: `Сильнее всего на бюджет влияет категория «${summary.topCategoryName ?? "Без категории"}». Следи за ней в первую очередь — это даст самый заметный эффект.`,
    tone: "neutral",
  };
}