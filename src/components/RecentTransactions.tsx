import { UtensilsCrossed, Wallet } from "lucide-react";
import { formatMoney } from "@/lib/utils";

type Expense = {
  id: string;
  amount: number;
  category: "food" | "other";
  note?: string;
  createdAt: string;
};

type RecentTransactionsProps = {
  expenses: Expense[];
};

function getCategoryLabel(category: Expense["category"]) {
  return category === "food" ? "Еда" : "Другое";
}

export function RecentTransactions({ expenses }: RecentTransactionsProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Последние расходы</h3>
        <span className="text-xs text-gray-500">{expenses.length}</span>
      </div>

      {expenses.length === 0 ? (
        <p className="text-sm text-gray-500">Пока нет расходов</p>
      ) : (
        <div className="space-y-2">
          {expenses.slice(0, 5).map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-gray-200 shrink-0">
                  {expense.category === "food" ? (
                    <UtensilsCrossed className="h-4 w-4 text-gray-700" />
                  ) : (
                    <Wallet className="h-4 w-4 text-gray-700" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {getCategoryLabel(expense.category)}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {expense.note || new Date(expense.createdAt).toLocaleDateString("ru-RU")}
                  </p>
                </div>
              </div>

              <span className="ml-3 text-sm font-semibold text-gray-900">
                −{formatMoney(expense.amount)} BYN
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}