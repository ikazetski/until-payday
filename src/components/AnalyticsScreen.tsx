import { useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";
import { format } from "date-fns";
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
  buildPeriodSpendingRhythm,
  buildWeekSpendingRhythm,
  type AnalyticsCategoryItem,
  type SpendingRhythmItem,
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
    <div
      className="rounded-2xl px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.22)] border"
      style={{
        backgroundColor: item.color,
        borderColor: item.color,
        color: "#ffffff",
      }}
    >
      <p className="text-sm font-semibold">{item.name}</p>
      <p className="text-xs mt-1 text-white/90">
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
      isPeak: boolean;
    };
  }>;
  currency: string;
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload;
  const bg = item.isPeak ? "#4F46E5" : "#818CF8";

  return (
    <div
      className="rounded-2xl px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.18)]"
      style={{ backgroundColor: bg, color: "#fff" }}
    >
      <p className="text-sm font-semibold">{item.label}</p>
      <p className="text-xs mt-1 text-white/90">
        {formatMoneyWithCurrency(item.amount, currency as never)}
      </p>
    </div>
  );
}

type PieShapeProps = {
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  fill?: string;
  index?: number;
  payload?: AnalyticsCategoryItem & {
    value?: number;
    gradientId?: string;
  };
  isActive?: boolean;
};

function renderPieShape(props: PieShapeProps) {
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

  if (
    cx === undefined ||
    cy === undefined ||
    innerRadius === undefined ||
    outerRadius === undefined ||
    startAngle === undefined ||
    endAngle === undefined ||
    payload === undefined
  ) {
    return <g />;
  }

  const safeFill = fill ?? payload.color ?? "#94a3b8";
  const activeOuterRadius = isActive ? outerRadius + 8 : outerRadius;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={activeOuterRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={safeFill}
        cornerRadius={10}
      />

      {isActive ? (
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={outerRadius + 10}
          outerRadius={outerRadius + 13}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={safeFill}
        />
      ) : null}
    </g>
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
    <div className="analytics-chart-shell relative h-[280px] w-full">
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
            innerRadius={78}
            outerRadius={108}
            paddingAngle={3}
            stroke="rgba(255,255,255,0.92)"
            strokeWidth={3}
            shape={(props: PieShapeProps) =>
              renderPieShape({
              ...props,
              isActive: props.index === activeIndex,
              })
            }
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onClick={(_, index) => setActiveIndex(index)}
            className="drop-shadow-[0_10px_24px_rgba(15,23,42,0.10)]"
            rootTabIndex={-1}
            isAnimationActive
            animationDuration={260}
            animationBegin={0}
          >
            {chartData.map((entry) => (
              <Cell key={entry.id} fill={`url(#${entry.gradientId})`} />
            ))}
          </Pie>

          <Tooltip
            content={<ChartTooltip currency={currency} />}
            cursor={false}
            wrapperStyle={{ outline: "none", zIndex: 30 }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="rounded-full border border-border/60 bg-background/95 px-5 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm max-w-[170px]">
          <p className="text-[11px] text-muted-foreground text-center">{centerLabel}</p>
          <p className="text-[1.05rem] font-bold text-center leading-tight mt-0.5 break-words">
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

  const rhythm = useMemo(() => {
    if (mode === "week") {
      return buildWeekSpendingRhythm({
        expenses: selectedExpenses,
      });
    }

    return buildPeriodSpendingRhythm({
      expenses: selectedExpenses,
      cycleStart: store.currentCycleStart,
      nextSalaryDate: store.nextSalaryDate,
    });
  }, [mode, selectedExpenses, store.currentCycleStart, store.nextSalaryDate]);

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

        <div className="mt-4 w-full rounded-[24px] bg-secondary p-1 grid grid-cols-2 gap-1">
          <button
            onClick={() => setMode("week")}
            className={cn(
              "h-12 rounded-[20px] text-base font-medium transition-all",
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
              "h-12 rounded-[20px] text-base font-medium transition-all",
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
          key={`${mode}-${summary.chartCategories.map((item) => item.id).join("-")}`}
          items={summary.chartCategories}
          centerLabel="Всего"
          centerValue={formatMoneyWithCurrency(summary.totalAmount, store.currency)}
          currency={store.currency}
        />

        <div className="flex flex-wrap gap-2 justify-center mt-4">
          {summary.chartCategories.map((item) => (
            <div
              key={item.id}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 shadow-[0_4px_12px_rgba(15,23,42,0.04)]"
              style={{
                backgroundColor: mixHexWithWhite(item.color, 0.88),
                border: `1px solid ${mixHexWithWhite(item.color, 0.55)}`,
              }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
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
              className={cn(
                "px-1 py-3",
                index !== summary.categories.length - 1 && "border-b border-border/60"
              )}
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

          <p className="text-xs text-muted-foreground text-right leading-[1.35] pt-[1px] shrink-0">
            В среднем {formatMoneyWithCurrency(rhythm.averageAmount, store.currency)} {rhythm.averageLabel}
          </p>
        </div>

        <div className="analytics-chart-shell h-[180px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rhythm.items}
              margin={{ top: 16, right: 8, left: 8, bottom: 0 }}
              barCategoryGap={10}
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
                tick={{ fill: "hsl(var(--foreground) / 0.74)", fontSize: 12, fontWeight: 500 }}
              />

              <Tooltip
                content={<RhythmTooltip currency={store.currency} />}
                cursor={false}
                wrapperStyle={{ outline: "none", zIndex: 30 }}
              />

              <Bar dataKey="amount" radius={[12, 12, 12, 12]} maxBarSize={36}>
                {rhythm.items.map((day: SpendingRhythmItem) => (
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

        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-background shadow-[0_8px_20px_rgba(15,23,42,0.08)] flex items-center justify-center">
            <Lightbulb
              className={cn(
                "w-5 h-5",
                advice.tone === "warning" && "text-rose-600",
                advice.tone === "positive" && "text-indigo-600",
                advice.tone === "neutral" && "text-indigo-600"
              )}
            />
          </div>

          <div className="mt-4">
            <p className="text-[1.1rem] font-semibold">{advice.title}</p>
            <p
              className={cn(
                "text-[1rem] mt-2 leading-relaxed",
                advice.tone === "warning" && "text-rose-700/90",
                advice.tone === "positive" && "text-indigo-700/90",
                advice.tone === "neutral" && "text-indigo-700/90"
              )}
            >
              {advice.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsScreen;