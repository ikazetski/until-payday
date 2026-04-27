import { useMemo, useState } from "react";
import { formatMoneyWithCurrency } from "@/lib/utils";
import type { Expense, CurrencyCode } from "@/hooks/useFinanceStore";
import { buildMonthlyGroups, buildWeeklyGroups } from "@/domain/historyEngine";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { getExpenseCategoryIcon, getExpenseCategoryName } from "@/lib/utils";

type HistoryScreenProps = {
  expenses: Expense[];
  monthlyBudget: number;
  salaryDay: number;
  trackingStartedAt: string;
  currency: CurrencyCode;
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
  expenseCategories,
}: {
  group: PeriodGroup;
  mode: HistoryMode;
  currency: CurrencyCode;
  expenseCategories: { id: string; name: string }[];
}) {
  const [expanded, setExpanded] = useState(false);

  const visibleExpenses = expanded ? group.expenses : [];
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
        {group.expenses.length === 0 ? (
          <p className="text-sm text-gray-500">Нет расходов за этот период</p>
        ) : (
          <>
            <div className="space-y-2">
              {visibleExpenses.map((expense) => {
                const Icon = getExpenseCategoryIcon(expense.category);

                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white">
                        <Icon className="h-4 w-4 text-gray-700" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(expense.createdAt).toLocaleDateString(
                            "ru-RU",
                          )}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {getExpenseCategoryName(
                            expense.category,
                            expenseCategories,
                          )}
                        </p>
                      </div>
                    </div>

                    <span className="ml-3 shrink-0 text-sm font-semibold text-gray-900">
                      −{formatMoneyWithCurrency(expense.amount, currency)}
                    </span>
                  </div>
                );
              })}
            </div>

            {group.expenses.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="mt-3 w-full rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
              >
                {expanded
                  ? "Скрыть операции"
                  : `Показать операции (${group.expenses.length})`}
              </button>
            )}
          </>
        )}
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
}: HistoryScreenProps) {
  const [mode, setMode] = useState<HistoryMode>("weeks");

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
  const expenseCategories = useFinanceStore((state) => state.expenseCategories);

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
              expenseCategories={expenseCategories}
            />
          ))}
        </div>
      )}
    </div>
  );
}
