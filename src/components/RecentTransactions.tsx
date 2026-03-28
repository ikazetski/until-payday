import { useMemo, useState } from "react";
import {
  Dumbbell,
  Fuel,
  PartyPopper,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { formatMoneyWithCurrency } from "@/lib/utils";
import type {
  Expense,
  ExpenseCategory,
  CurrencyCode,
} from "@/hooks/useFinanceStore";

type RecentTransactionsProps = {
  expenses: Expense[];
  periodTitle: string;
  currency: CurrencyCode;
};

function getCategoryLabel(category: ExpenseCategory) {
  switch (category) {
    case "food":
      return "Еда";
    case "sport":
      return "Спорт";
    case "fuel":
      return "Бензин";
    case "entertainment":
      return "Развлечения";
    default:
      return "Другое";
  }
}

function getCategoryIcon(category: ExpenseCategory) {
  switch (category) {
    case "food":
      return UtensilsCrossed;
    case "sport":
      return Dumbbell;
    case "fuel":
      return Fuel;
    case "entertainment":
      return PartyPopper;
    default:
      return Wallet;
  }
}

export function RecentTransactions({
  expenses,
  periodTitle,
  currency,
}: RecentTransactionsProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleExpenses = useMemo(() => {
    if (expanded) return expenses;
    return expenses.slice(0, 5);
  }, [expanded, expenses]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Последние расходы</h3>
          <p className="mt-0.5 text-xs text-gray-500">{periodTitle}</p>
        </div>

        <span className="text-xs text-gray-500">{expenses.length}</span>
      </div>

      {expenses.length === 0 ? (
        <div className="rounded-xl bg-gray-50 px-4 py-4">
          <p className="text-sm font-medium text-gray-900">Пока нет расходов</p>
          <p className="mt-1 text-xs text-gray-500">
            Добавь первый расход за этот период
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {visibleExpenses.map((expense) => {
              const Icon = getCategoryIcon(expense.category);

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
                        {getCategoryLabel(expense.category)}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {new Date(expense.createdAt).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  </div>

                  <span className="ml-3 text-sm font-semibold text-gray-900">
                    −{formatMoneyWithCurrency(expense.amount, currency)}
                  </span>
                </div>
              );
            })}
          </div>

          {expenses.length > 5 && (
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
  );
}