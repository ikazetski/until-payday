import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { formatMoneyWithCurrency, } from "@/lib/utils";
import type { Expense, CurrencyCode } from "@/hooks/useFinanceStore";
import { buildMonthlyGroups, buildWeeklyGroups } from "@/lib/finance";

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

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getWeekStart(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDay(
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff)
  );
}

function getWeekEnd(date: Date) {
  const start = getWeekStart(date);
  return startOfDay(
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
  );
}

function countInclusiveDays(start: Date, end: Date) {
  const startDate = startOfDay(start);
  const endDate = startOfDay(end);

  if (startDate.getTime() > endDate.getTime()) {
    return 0;
  }

  const DAY_MS = 1000 * 60 * 60 * 24;
  return Math.floor((endDate.getTime() - startDate.getTime()) / DAY_MS) + 1;
}

function getSafeDay(year: number, month: number, salaryDay: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(Math.max(salaryDay, 1), daysInMonth);
}

function getNextSalaryDateFrom(referenceDate: Date, salaryDay: number) {
  const date = startOfDay(referenceDate);
  const year = date.getFullYear();
  const month = date.getMonth();

  const thisMonthDate = new Date(year, month, getSafeDay(year, month, salaryDay));

  if (thisMonthDate > date) {
    return thisMonthDate;
  }

  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonth = (month + 1) % 12;

  return new Date(
    nextMonthYear,
    nextMonth,
    getSafeDay(nextMonthYear, nextMonth, salaryDay)
  );
}

function getPreviousSalaryDateFrom(referenceDate: Date, salaryDay: number) {
  const date = startOfDay(referenceDate);
  const year = date.getFullYear();
  const month = date.getMonth();

  const thisMonthDate = new Date(year, month, getSafeDay(year, month, salaryDay));

  if (thisMonthDate <= date) {
    return thisMonthDate;
  }

  const prevMonthYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;

  return new Date(
    prevMonthYear,
    prevMonth,
    getSafeDay(prevMonthYear, prevMonth, salaryDay)
  );
}

function getMaxDate(a: Date, b: Date) {
  return a.getTime() >= b.getTime() ? a : b;
}

function getMinDate(a: Date, b: Date) {
  return a.getTime() <= b.getTime() ? a : b;
}

function getDeltaLabel(delta: number, mode: HistoryMode, isCurrentPeriod: boolean) {
  if (delta < 0) return "Перерасход";

  if (mode === "weeks") {
    return isCurrentPeriod ? "Остаток" : "Сэкономлено";
  }

  return isCurrentPeriod ? "Остаток" : "Сэкономлено";
}

function roundMoney(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function HistoryPeriodCard({
  group,
  mode,
  currency,
}: {
  group: PeriodGroup;
  mode: HistoryMode;
  currency: CurrencyCode;
}) {
  const [expanded, setExpanded] = useState(false);

  const visibleExpenses = expanded ? group.expenses : group.expenses.slice(0, 5);
  const isCurrentPeriod = Boolean(group.subtitle);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{group.title}</h2>
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
              {visibleExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(expense.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {expense.note || "Расход"}
                    </p>
                  </div>

                  <span className="ml-3 text-sm font-semibold text-gray-900">
                    −{formatMoneyWithCurrency(expense.amount, currency)}
                  </span>
                </div>
              ))}
            </div>

            {group.expenses.length > 5 && (
              <button
                onClick={() => setExpanded((prev) => !prev)}
                className="mt-3 w-full rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
              >
                {expanded ? "Скрыть" : "Показать все"}
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
  () => buildWeeklyGroups(expenses, monthlyBudget, salaryDay, trackingStartedAt),
  [expenses, monthlyBudget, salaryDay, trackingStartedAt]
);

  const monthlyGroups = useMemo(
    () => buildMonthlyGroups(expenses, monthlyBudget, salaryDay, trackingStartedAt),
    [expenses, monthlyBudget, salaryDay, trackingStartedAt]
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

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1">
        <button
          onClick={() => setMode("weeks")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            mode === "weeks"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500"
          }`}
        >
          Недели
        </button>
        <button
          onClick={() => setMode("months")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            mode === "months"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500"
          }`}
        >
          Месяцы
        </button>
      </div>

      {visibleGroups.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-900">История пока пуста</p>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}