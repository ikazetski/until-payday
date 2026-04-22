import { useMemo, useState } from "react";
import { ChevronRight, Info, TrendingDown, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { cn, formatMoneyWithCurrency } from "@/lib/utils";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { buildAnalyticsSummary } from "@/domain/analyticsEngine";

type AnalyticsMode = "period" | "week";

function ChartTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: {
      name: string;
      amount: number;
      share: number;
      color: string;
    };
  }>;
  currency: string;
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload;

  return (
    <div className="rounded-2xl border border-border bg-background px-3 py-2 shadow-lg">
      <p className="text-sm font-medium">{item.name}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {formatMoneyWithCurrency(item.amount, currency as never)} · {item.share}%
      </p>
    </div>
  );
}

function DonutChart({
  items,
  centerLabel,
  centerValue,
  currency,
}: {
  items: Array<{
    id: string;
    name: string;
    amount: number;
    share: number;
    color: string;
  }>;
  centerLabel: string;
  centerValue: string;
  currency: string;
}) {
  const chartData = items.map((item) => ({
    ...item,
    value: item.amount,
  }));

  return (
    <div className="relative h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={84}
            paddingAngle={2}
            stroke="none"
          >
            {chartData.map((entry) => (
              <Cell key={entry.id} fill={entry.color} />
            ))}
          </Pie>

          <Tooltip
            content={<ChartTooltip currency={currency} />}
            cursor={false}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[11px] text-muted-foreground">{centerLabel}</p>
        <p className="text-lg font-bold text-center px-4 leading-tight">
          {centerValue}
        </p>
      </div>
    </div>
  );
}

export function AnalyticsScreen() {
  const store = useFinanceStore();
  const [mode, setMode] = useState<AnalyticsMode>("period");

  const cycleExpenses = useMemo(() => {
    const cycleStart = store.currentCycleStart.getTime();
    const nextSalaryDate = store.nextSalaryDate.getTime();

    return store.recentExpenses.filter((expense) => {
      const expenseDate = new Date(expense.createdAt).getTime();
      return expenseDate >= cycleStart && expenseDate < nextSalaryDate;
    });
  }, [store.recentExpenses, store.currentCycleStart, store.nextSalaryDate]);

  const weekExpenses = useMemo(() => {
    const start = store.currentWeekStart.getTime();
    const endExclusive = new Date(
      store.currentWeekEnd.getFullYear(),
      store.currentWeekEnd.getMonth(),
      store.currentWeekEnd.getDate() + 1
    ).getTime();

    return store.recentExpenses.filter((expense) => {
      const expenseTime = new Date(expense.createdAt).getTime();
      return expenseTime >= start && expenseTime < endExclusive;
    });
  }, [store.recentExpenses, store.currentWeekStart, store.currentWeekEnd]);

  const selectedExpenses = mode === "period" ? cycleExpenses : weekExpenses;

  const summary = useMemo(() => {
    return buildAnalyticsSummary({
      expenses: selectedExpenses,
      categories: store.expenseCategories,
    });
  }, [selectedExpenses, store.expenseCategories]);

  const periodDelta =
  mode === "period"
    ? Number(store.savings ?? 0)
    : Number(store.weeklySavings ?? 0);
  const trendPositive = periodDelta >= 0;

  const rangeLabel =
    mode === "period"
      ? `До ${format(store.nextSalaryDate, "d MMMM", { locale: ru })}`
      : `${format(store.currentWeekStart, "d MMM", { locale: ru })} – ${format(
          store.currentWeekEnd,
          "d MMM",
          { locale: ru }
        )}`;

  if (summary.categories.length === 0) {
    return (
      <div className="px-5 pt-10 pb-24 max-w-md mx-auto">
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight">Аналитика</h1>
          <p className="text-sm text-muted-foreground mt-1">Куда уходят деньги</p>
        </div>

        <div className="inline-flex rounded-2xl bg-secondary p-1 mb-5">
          <button
            onClick={() => setMode("period")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              mode === "period"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground"
            )}
          >
            Период
          </button>
          <button
            onClick={() => setMode("week")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              mode === "week"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground"
            )}
          >
            Неделя
          </button>
        </div>

        <div className="finance-card">
          <p className="text-sm font-medium">Пока недостаточно данных</p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Добавь несколько расходов, и здесь появится распределение по категориям
            и краткая аналитика.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-10 pb-24 max-w-md mx-auto">
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Аналитика</h1>
            <p className="text-sm text-muted-foreground mt-1">Куда уходят деньги</p>
          </div>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Информация об аналитике"
          >
            <Info className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="inline-flex rounded-2xl bg-secondary p-1 mt-4">
          <button
            onClick={() => setMode("period")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              mode === "period"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground"
            )}
          >
            Период
          </button>
          <button
            onClick={() => setMode("week")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              mode === "week"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground"
            )}
          >
            Неделя
          </button>
        </div>
      </div>

      <div className="finance-card">
        <div className="mb-4">
          <p className="text-sm font-medium">Распределение расходов</p>
          <p className="text-xs text-muted-foreground mt-1">{rangeLabel}</p>
        </div>

        <div className="flex justify-center py-2">
          <DonutChart
            items={summary.chartCategories}
            centerLabel="Всего"
            centerValue={formatMoneyWithCurrency(summary.totalAmount, store.currency)}
            currency={store.currency}
          />
        </div>

        <div className="flex flex-wrap gap-2 justify-center mt-4">
          {summary.chartCategories.map((item) => (
            <div
              key={item.id}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/45 px-3 py-1.5"
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="finance-card p-3">
          <p className="text-[11px] text-muted-foreground">Всего</p>
          <p className="text-base font-bold mt-1 leading-tight">
            {formatMoneyWithCurrency(summary.totalAmount, store.currency)}
          </p>
        </div>

        <div className="finance-card p-3">
          <p className="text-[11px] text-muted-foreground">Топ-3</p>
          <p className="text-base font-bold mt-1 leading-tight">
            {summary.top3Share.toFixed(0)}%
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">всех трат</p>
        </div>

        <div className="finance-card p-3">
          <p className="text-[11px] text-muted-foreground">По плану</p>
          <p
            className={cn(
              "text-base font-bold mt-1 leading-tight",
              trendPositive ? "text-emerald-600" : "text-red-500"
            )}
          >
            {periodDelta > 0 ? "+" : ""}
            {periodDelta.toLocaleString("ru-RU")}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">от плана</p>
        </div>
      </div>

      <div className="finance-card mt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium">Категории</p>
            <p className="text-xs text-muted-foreground mt-1">
              Все категории за выбранный период
            </p>
          </div>

          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            {summary.categories.length}
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="space-y-4">
          {summary.categories.map((item, index) => (
            <div key={item.id}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.transactions} {item.transactions === 1 ? "операция" : "операции"}
                      {index === 0 ? " · лидер по расходам" : ""}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-semibold">
                    {formatMoneyWithCurrency(item.amount, store.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.share}%</p>
                </div>
              </div>

              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${item.share}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="finance-card mt-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
              trendPositive
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-red-500/10 text-red-500"
            )}
          >
            {trendPositive ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
          </div>

          <div>
            <p className="text-sm font-medium">Краткий вывод</p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {trendPositive ? (
                <>
                  Сейчас ты идешь <span className="text-foreground font-medium">лучше плана</span>.
                  Основная часть расходов сосредоточена в категории{" "}
                  <span className="text-foreground font-medium">
                    {summary.topCategoryName}
                  </span>
                  , но в целом траты пока под контролем.
                </>
              ) : (
                <>
                  Сейчас есть{" "}
                  <span className="text-foreground font-medium">
                    перерасход относительно плана
                  </span>
                  . Важно не только то, что лидирует категория{" "}
                  <span className="text-foreground font-medium">
                    {summary.topCategoryName}
                  </span>
                  , но и то, что топ-3 категории уже занимают{" "}
                  <span className="text-foreground font-medium">
                    {summary.top3Share.toFixed(0)}%
                  </span>{" "}
                  всех расходов.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsScreen;