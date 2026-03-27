import { formatMoney } from "@/lib/utils";

type Expense = {
  id: string;
  amount: number;
  category: "food" | "other";
  note?: string;
  createdAt: string;
};

type HistoryScreenProps = {
  expenses: Expense[];
  monthlyBudget: number;
};

function getMonthLabel(date: Date) {
  return date
    .toLocaleDateString("ru-RU", {
      month: "long",
      year: "numeric",
    })
    .replace(/^./, (s) => s.toUpperCase());
}

function getMonthExpenses(expenses: Expense[], year: number, month: number) {
  return expenses.filter((expense) => {
    const date = new Date(expense.createdAt);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

function getDeltaLabel(delta: number, isCurrentMonth: boolean) {
  if (delta < 0) {
    return "Перерасход";
  }

  return isCurrentMonth ? "Остаток" : "Сэкономлено";
}

export function HistoryScreen({
  expenses,
  monthlyBudget,
}: HistoryScreenProps) {
  const now = new Date();

  const currentMonthExpenses = getMonthExpenses(
    expenses,
    now.getFullYear(),
    now.getMonth()
  );
  const currentMonthTotal = currentMonthExpenses.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  const currentMonthDelta = monthlyBudget - currentMonthTotal;

  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthExpenses = getMonthExpenses(
    expenses,
    previousMonthDate.getFullYear(),
    previousMonthDate.getMonth()
  );
  const previousMonthTotal = previousMonthExpenses.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  const previousMonthDelta = monthlyBudget - previousMonthTotal;

  return (
    <div className="min-h-screen bg-background px-5 pt-safe pb-24 max-w-md mx-auto">
      <div className="pt-10 mb-6">
        <h1 className="text-2xl font-bold tracking-tight !m-0">История</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Сводка по месяцам и отклонению от лимита
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">
            {getMonthLabel(now)}
          </h2>
          <span className="text-xs text-gray-500">Текущий месяц</span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Расходы за месяц</span>
            <span className="font-semibold text-gray-900">
              {formatMoney(currentMonthTotal)} BYN
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Лимит</span>
            <span className="font-semibold text-gray-900">
              {formatMoney(monthlyBudget)} BYN
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {getDeltaLabel(currentMonthDelta, true)}
            </span>
            <span
              className={`font-semibold ${
                currentMonthDelta >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {currentMonthDelta > 0 ? "+" : ""}
              {formatMoney(currentMonthDelta)} BYN
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">
            {getMonthLabel(previousMonthDate)}
          </h2>
          <span className="text-xs text-gray-500">Прошлый месяц</span>
        </div>

        {previousMonthExpenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Истории за прошлый месяц еще нет.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Расходы за месяц</span>
              <span className="font-semibold text-gray-900">
                {formatMoney(previousMonthTotal)} BYN
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Лимит</span>
              <span className="font-semibold text-gray-900">
                {formatMoney(monthlyBudget)} BYN
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {getDeltaLabel(previousMonthDelta, false)}
              </span>
              <span
                className={`font-semibold ${
                  previousMonthDelta >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {previousMonthDelta > 0 ? "+" : ""}
                {formatMoney(previousMonthDelta)} BYN
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}