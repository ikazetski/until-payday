import { useMemo, useState } from "react";
import { formatMoneyWithCurrency } from "@/lib/utils";
import type { Expense, CurrencyCode } from "@/hooks/useFinanceStore";
import { buildMonthlyGroups, buildWeeklyGroups } from "@/domain/historyEngine";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { useSwipeTabs } from "@/hooks/useSwipeTabs";

export type SelectedAnalyticsRange = {
  mode: "week" | "period";
  title: string;
  rangeStart: string;
  rangeEndExclusive: string;
};

type HistoryScreenProps = {
  expenses: Expense[];
  monthlyBudget: number;
  salaryDay: number;
  trackingStartedAt: string;
  currency: CurrencyCode;
  onOpenAnalytics?: (range: SelectedAnalyticsRange) => void;
};

type HistoryMode = "weeks" | "months";

type PeriodGroup = {
  id: string;
  title: string;
  subtitle?: string;
  expenses: Expense[];
  total: number;
  limit: number;
  delta: number;
  isCurrent?: boolean;
  rangeStart: Date;
  rangeEndExclusive: Date;
};

function getDeltaLabel(
  delta: number,
  mode: HistoryMode,
  isCurrentPeriod: boolean,
) {
  if (delta < 0) return "Перерасход";

  if (mode === "weeks") {
    return isCurrentPeriod ? "Остаток" : "Сэкономлено";
  }

  return isCurrentPeriod ? "Остаток" : "Сэкономлено";
}

function HistoryPeriodCard({
  group,
  mode,
  currency,
  onOpenAnalytics,
}: {
  group: PeriodGroup;
  mode: HistoryMode;
  currency: CurrencyCode;
  onOpenAnalytics?: (range: SelectedAnalyticsRange) => void;
}) {
  const isCurrentPeriod = Boolean(group.subtitle);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {group.title}
          </h2>
          {group.subtitle && (
            <p className="mt-0.5 text-xs text-gray-500">{group.subtitle}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Расходы</span>
          <span className="font-semibold text-gray-900">
            {formatMoneyWithCurrency(group.total, currency)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {mode === "weeks" ? "Лимит недели" : "Лимит месяца"}
          </span>
          <span className="font-semibold text-gray-900">
            {formatMoneyWithCurrency(group.limit, currency)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {getDeltaLabel(group.delta, mode, isCurrentPeriod)}
          </span>
          <span
            className={`font-semibold ${
              group.delta >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {group.delta > 0 ? "+" : ""}
            {formatMoneyWithCurrency(group.delta, currency)}
          </span>
        </div>
      </div>
      <div className="mt-4 border-t border-gray-200 pt-4">
        <div className="mt-4 border-t border-border pt-3">
          <button
            type="button"
            onClick={() =>
              onOpenAnalytics?.({
                mode: mode === "weeks" ? "week" : "period",
                title: group.title,
                rangeStart: group.rangeStart.toISOString(),
                rangeEndExclusive: group.rangeEndExclusive.toISOString(),
              })
            }
            className="w-full rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Аналитика
          </button>
        </div>
      </div>
    </div>
  );
}

export function HistoryScreen({
  expenses,
  monthlyBudget,
  salaryDay,
  trackingStartedAt,
  currency,
  onOpenAnalytics,
}: HistoryScreenProps) {
  const [mode, setMode] = useState<HistoryMode>("weeks");
  const swipeHandlers = useSwipeTabs<HistoryMode>({
    value: mode,
    values: ["weeks", "months"],
    onChange: setMode,
  });

  const weeklyGroups = useMemo(
    () =>
      buildWeeklyGroups(expenses, monthlyBudget, salaryDay, trackingStartedAt),
    [expenses, monthlyBudget, salaryDay, trackingStartedAt],
  );

  const monthlyGroups = useMemo(
    () =>
      buildMonthlyGroups(expenses, monthlyBudget, salaryDay, trackingStartedAt),
    [expenses, monthlyBudget, salaryDay, trackingStartedAt],
  );

  const visibleGroups = mode === "weeks" ? weeklyGroups : monthlyGroups;

  return (
    <div className="min-h-screen max-w-md mx-auto bg-background px-5 pt-safe pb-24">
      <div className="pt-10 mb-6">
        <h1 className="text-2xl font-bold tracking-tight !m-0">История</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Сводка по неделям и месяцам
        </p>
      </div>

      <SegmentedTabs
        value={mode}
        onChange={setMode}
        options={[
          { value: "weeks", label: "Недели" },
          { value: "months", label: "Месяцы" },
        ]}
      />

      <div {...swipeHandlers}>
        {visibleGroups.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-900">
              История пока пуста
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Добавь расходы, и здесь появится статистика по неделям и месяцам
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleGroups.map((group) => (
              <HistoryPeriodCard
                key={group.id}
                group={group}
                mode={mode}
                currency={currency}
                onOpenAnalytics={onOpenAnalytics}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
