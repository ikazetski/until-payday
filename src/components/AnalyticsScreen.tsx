import { useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
} from "recharts";

import { cn, formatMoneyWithCurrency } from "@/lib/utils";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import {
  buildAnalyticsAdvice,
  buildAnalyticsSummary,
  buildSpendingRhythm,
  type AnalyticsCategoryItem,
} from "@/domain/analyticsEngine";

type AnalyticsMode = "week" | "period";

function mixHexWithWhite(hex: string, ratio: number) {
  const clean = hex.replace("#", "");
  const value =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;

  const num = parseInt(value, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * ratio)
      .toString(16)
      .padStart(2, "0");

  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

function ChartTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{
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
    <div className="rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.28)]">
      <p className="text-sm font-medium text-white">{item.name}</p>
      <p className="text-xs text-white/70 mt-1">
        {formatMoneyWithCurrency(item.amount, currency as never)} · {item.share}%
      </p>
    </div>
  );
}

function RhythmTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{
    payload: {
      label: string;
      amount: number;
    };
  }>;
  currency: string;
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.28)]">
      <p className="text-sm font-medium text-white">{item.label}</p>
      <p className="text-xs text-white/70 mt-1">
        {formatMoneyWithCurrency(item.amount, currency as never)}
      </p>
    </div>
  );
}

function renderPieShape(props: any) {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    isActive,
  } = props;

  if (isActive) {
    return (
      <g filter="url(#analytics-donut-active-shadow)">
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          cornerRadius={10}
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={outerRadius + 7}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={mixHexWithWhite(payload.color, 0.35)}
          opacity={0.55}
        />
      </g>
    );
  }

  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      cornerRadius={10}
    />
  );
}

function DonutChart({
  items,
  centerLabel,
  centerValue,
  currency,
}: {
  items: AnalyticsCategoryItem[];
  centerLabel: string;
  centerValue: string;
  currency: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const chartData = items.map((item, index) => ({
    ...item,
    value: item.amount,
    gradientId: `analytics-donut-gradient-${index}`,
  }));

  return (
    <div className="analytics-chart-shell relative h-[248px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            {chartData.map((item) => (
              <linearGradient
                key={item.gradientId}
                id={item.gradientId}
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop offset="0%" stopColor={mixHexWithWhite(item.color, 0.16)} />
                <stop offset="100%" stopColor={item.color} />
              </linearGradient>
            ))}

            <filter id="analytics-donut-active-shadow" x="-60%" y="-60%" width="220%" height="220%">
              <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="rgba(15,23,42,0.16)" />
            </filter>
          </defs>

          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={3}
            stroke="rgba(255,255,255,0.92)"
            strokeWidth={3}
            shape={(props: any) =>
              renderPieShape({
              ...props,
              isActive: props.index === activeIndex,
              })
            }
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onClick={(_, index) => setActiveIndex(index)}
            className="drop-shadow-[0_10px_24px_rgba(15,23,42,0.10)]"
            rootTabIndex={-1}
          >
            {chartData.map((entry) => (
              <Cell key={entry.id} fill={`url(#${entry.gradientId})`} />
            ))}
          </Pie>

          <Tooltip
            content={<ChartTooltip currency={currency} />}
            cursor={false}
            wrapperStyle={{ outline: "none" }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="rounded-full border border-border/60 bg-background/95 px-4 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <p className="text-[11px] text-muted-foreground text-center">{centerLabel}</p>
          <p className="text-[1.15rem] font-bold text-center leading-tight mt-0.5">
            {centerValue}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsScreen() {
  const store = useFinanceStore();
  const [mode, setMode] = useState<AnalyticsMode>("week");

  const cycleExpenses = useMemo(() => {
    const cycleStart = store.currentCycleStart.getTime();
    const nextSalaryDate = store.nextSalaryDate.getTime();

    return (store.recentExpenses ?? []).filter((expense) => {
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

    return (store.recentExpenses ?? []).filter((expense) => {
      const expenseTime = new Date(expense.createdAt).getTime();
      return expenseTime >= start && expenseTime < endExclusive;
    });
  }, [store.recentExpenses, store.currentWeekStart, store.currentWeekEnd]);

  const selectedExpenses = mode === "period" ? cycleExpenses : weekExpenses;

  const summary = useMemo(() => {
    return buildAnalyticsSummary({
      expenses: selectedExpenses,
      categories: store.expenseCategories ?? [],
    });
  }, [selectedExpenses, store.expenseCategories]);

  const rangeDays =
    mode === "period"
      ? Math.max(
          differenceInCalendarDays(store.nextSalaryDate, store.currentCycleStart),
          1
        )
      : 7;

  const rhythm = useMemo(() => {
    return buildSpendingRhythm({
      expenses: selectedExpenses,
      rangeDays,
    });
  }, [selectedExpenses, rangeDays]);

  const periodDelta =
    mode === "period"
      ? Number(store.savings ?? 0)
      : Number(store.weeklySavings ?? 0);

  const trendPositive = periodDelta >= 0;

  const advice = useMemo(() => {
    return buildAnalyticsAdvice({
      periodDelta,
      summary,
      rhythm,
    });
  }, [periodDelta, summary, rhythm]);

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
          <p className="text-sm text-muted-foreground mt-1">Структура расходов</p>
        </div>

        <div className="inline-flex rounded-2xl bg-secondary p-1 mb-5">
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
        </div>

        <div className="finance-card">
          <p className="text-sm font-medium">Пока недостаточно данных</p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Добавь несколько расходов, и здесь появится распределение по категориям,
            ритм трат и персональный совет.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-10 pb-24 max-w-md mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight">Аналитика</h1>
        <p className="text-sm text-muted-foreground mt-1">Структура расходов</p>

        <div className="inline-flex rounded-2xl bg-secondary p-1 mt-4">
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
        </div>
      </div>

      <div className="finance-card">
        <div className="mb-4">
          <p className="text-sm font-medium">Распределение расходов</p>
          <p className="text-xs text-muted-foreground mt-1">{rangeLabel}</p>
        </div>

        <DonutChart
          items={summary.chartCategories}
          centerLabel="Всего"
          centerValue={formatMoneyWithCurrency(summary.totalAmount, store.currency)}
          currency={store.currency}
        />

        <div className="flex flex-wrap gap-2 justify-center mt-3">
          {summary.chartCategories.map((item) => (
            <div
              key={item.id}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-[0_3px_10px_rgba(15,23,42,0.04)]"
              style={{
                borderColor: `${item.color}55`,
                backgroundColor: `${item.color}10`,
              }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0 shadow-[0_0_0_2px_rgba(255,255,255,0.7)]"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs font-medium">{item.name}</span>
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
          <p className="text-[11px] text-muted-foreground">
            {trendPositive ? "Сэкономлено" : "Перерасход"}
          </p>
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
        <div className="mb-4">
          <p className="text-sm font-medium">Категории</p>
          <p className="text-xs text-muted-foreground mt-1">
            Все категории за выбранный период
          </p>
        </div>

        <div className="space-y-3">
          {summary.categories.map((item, index) => (
            <div
              key={item.id}
              className="rounded-2xl border border-border/55 bg-background/55 px-3 py-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                    style={{ backgroundColor: `${item.color}18` }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.65)]"
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

              <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                  style={{
                    width: `${item.share}%`,
                    background: `linear-gradient(90deg, ${mixHexWithWhite(item.color, 0.22)} 0%, ${item.color} 100%)`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="finance-card mt-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium">Ритм трат</p>
            <p className="text-xs text-muted-foreground mt-1">
              Когда расходы активнее всего
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            ø {formatMoneyWithCurrency(rhythm.averagePerDay, store.currency)}/день
          </p>
        </div>

        <div className="analytics-chart-shell h-[180px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rhythm.days}
              margin={{ top: 16, right: 8, left: 8, bottom: 0 }}
              barCategoryGap={22}
            >
              <defs>
                <linearGradient id="rhythm-bar-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C7D2FE" />
                  <stop offset="100%" stopColor="#818CF8" />
                </linearGradient>
                <linearGradient id="rhythm-peak-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A78BFA" />
                  <stop offset="100%" stopColor="#4F46E5" />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />

              <Tooltip
                content={<RhythmTooltip currency={store.currency} />}
                cursor={false}
                wrapperStyle={{ outline: "none" }}
              />

              <Bar dataKey="amount" radius={[10, 10, 10, 10]} maxBarSize={24}>
                {rhythm.days.map((day) => (
                  <Cell
                    key={day.key}
                    fill={day.isPeak ? "url(#rhythm-peak-gradient)" : "url(#rhythm-bar-gradient)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div
        className={cn(
          "mt-4 rounded-[28px] px-5 py-5 border overflow-hidden relative",
          advice.tone === "positive" &&
            "bg-[linear-gradient(135deg,rgba(79,70,229,0.08),rgba(99,102,241,0.02))] border-indigo-100",
          advice.tone === "warning" &&
            "bg-[linear-gradient(135deg,rgba(251,113,133,0.08),rgba(248,113,113,0.02))] border-rose-100",
          advice.tone === "neutral" &&
            "bg-[linear-gradient(135deg,rgba(99,102,241,0.08),rgba(99,102,241,0.02))] border-indigo-100"
        )}
      >
        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/30 blur-sm" />

        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-background shadow-[0_8px_20px_rgba(15,23,42,0.08)] flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5 text-indigo-600" />
          </div>

          <div>
            <p className="text-[1.1rem] font-semibold">{advice.title}</p>
            <p className="text-[1rem] text-indigo-700/90 mt-2 leading-relaxed">
              {advice.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsScreen;