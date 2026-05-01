import { useEffect, useMemo, useRef, useState } from "react";
import { Info, Settings, Wallet, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import {
  cn,
  formatMoney,
  formatMoneyWithCurrency,
  getCurrencySymbol,
} from "@/lib/utils";
import { useFinanceStore, type ExpenseCategory } from "@/hooks/useFinanceStore";
import { QuickActions } from "@/components/QuickActions";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { StatusIndicator } from "@/components/StatusIndicator";
import { SettingsSheet } from "@/components/SettingsSheet";
import { RecentTransactions } from "@/components/RecentTransactions";
import { BottomNav } from "@/components/BottomNav";
import { HistoryScreen } from "@/components/HistoryScreen";
import { AnalyticsScreen } from "@/components/AnalyticsScreen";

const Index = () => {
  const store = useFinanceStore();
  const isHydrated = useFinanceStore((state) => state.isHydrated);
  const hydrate = useFinanceStore((state) => state.hydrate);

  const currencySymbol = getCurrencySymbol(store.currency);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "analytics" | "history">(
    "home",
  );
  const [showWeeklyInfo, setShowWeeklyInfo] = useState(false);
  const [showMonthlyInfo, setShowMonthlyInfo] = useState(false);
  const [activeCard, setActiveCard] = useState<0 | 1>(0);
  const [undoExpense, setUndoExpense] = useState<{
    id: string;
    amount: number;
  } | null>(null);

  const [settingsUndo, setSettingsUndo] = useState<{
    monthlyBudget: number;
    salaryDay: number;
    currency: typeof store.currency;
    trackingStartedAt: string;
  } | null>(null);

  const undoTimerRef = useRef<number | null>(null);
  const settingsUndoTimerRef = useRef<number | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const clearUndoTimer = () => {
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  };

  const clearSettingsUndoTimer = () => {
    if (settingsUndoTimerRef.current) {
      window.clearTimeout(settingsUndoTimerRef.current);
      settingsUndoTimerRef.current = null;
    }
  };

  const showUndoForLastExpense = () => {
    const latest = useFinanceStore.getState().recentExpenses[0];
    if (!latest) return;

    setUndoExpense({ id: latest.id, amount: latest.amount });

    clearUndoTimer();

    undoTimerRef.current = window.setTimeout(() => {
      setUndoExpense(null);
      undoTimerRef.current = null;
    }, 5000);
  };

  const handleExpenseAdd = (amount: number, category: ExpenseCategory) => {
    store.addExpense(amount, category);
    showUndoForLastExpense();
  };

  const handleSettingsSave = (
    monthlyBudget: number,
    salaryDay: number,
    currency: typeof store.currency,
  ) => {
    const snapshot = {
      monthlyBudget: store.monthlyBudget,
      salaryDay: store.salaryDay,
      currency: store.currency,
      trackingStartedAt: store.trackingStartedAt,
    };

    store.updateSettings(monthlyBudget, salaryDay, currency);
    setSettingsUndo(snapshot);

    clearSettingsUndoTimer();

    settingsUndoTimerRef.current = window.setTimeout(() => {
      setSettingsUndo(null);
      settingsUndoTimerRef.current = null;
    }, 5000);
  };

  const handleUndoSettings = () => {
    if (!settingsUndo) return;

    store.restoreSettings(settingsUndo);
    setSettingsUndo(null);
    clearSettingsUndoTimer();
  };

  const handleUndoExpense = () => {
    if (!undoExpense) return;

    store.removeExpense(undoExpense.id);
    setUndoExpense(null);
    clearUndoTimer();
  };

  useEffect(() => {
    return () => {
      clearUndoTimer();
      clearSettingsUndoTimer();
    };
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return;

    const refresh = () => useFinanceStore.getState().refreshDerived();

    refresh();

    const intervalId = window.setInterval(refresh, 60 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isHydrated]);

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
      store.currentWeekEnd.getDate() + 1,
    ).getTime();

    return store.recentExpenses.filter((expense) => {
      const expenseTime = new Date(expense.createdAt).getTime();
      return expenseTime >= start && expenseTime < endExclusive;
    });
  }, [store.recentExpenses, store.currentWeekStart, store.currentWeekEnd]);

  const currentPeriodExpenses = activeCard === 0 ? weekExpenses : cycleExpenses;

  const currentPeriodTitle =
    activeCard === 0
      ? `${format(store.currentWeekStart, "d MMM", { locale: ru })} – ${format(
          store.currentWeekEnd,
          "d MMM",
          { locale: ru },
        )}`
      : `До ${format(store.nextSalaryDate, "d MMMM", { locale: ru })}`;

  const goToCard = (index: 0 | 1) => {
    setActiveCard(index);

    if (!carouselRef.current) return;

    const width = carouselRef.current.clientWidth;
    carouselRef.current.scrollTo({
      left: width * index,
      behavior: "smooth",
    });
  };

  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;

    const width = carouselRef.current.clientWidth;
    const left = carouselRef.current.scrollLeft;

    if (left < width / 2) {
      setActiveCard(0);
    } else {
      setActiveCard(1);
    }
  };

  const weekPlanValue = store.weeklySavings;
  const weekPlanTitle =
    weekPlanValue < 0
      ? "Перерасход"
      : weekPlanValue > 0
        ? "Сэкономлено"
        : "По плану";

  const weekPlanDisplay =
    weekPlanValue < 0
      ? `-${formatMoney(Math.abs(weekPlanValue))}`
      : formatMoney(weekPlanValue);

  const monthPlanValue = store.savings;
  const monthPlanTitle =
    monthPlanValue < 0
      ? "Перерасход"
      : monthPlanValue > 0
        ? "Сэкономлено"
        : "По плану";

  const monthPlanDisplay =
    monthPlanValue < 0
      ? `-${formatMoney(Math.abs(monthPlanValue))}`
      : formatMoney(monthPlanValue);

  const cardClassName =
    "rounded-[32px] bg-gradient-to-br px-6 pt-5 pb-4 shadow-lg min-h-[320px]";

  const toneMap = {
    green: {
      card: "from-[#7B6DFF] to-[#4E5BFF]",
      value: "text-white",
      muted: "text-white/70",
      progressTrack: "bg-white/15",
      progressFill: "bg-white/70",
      negative: "text-red-300",
    },
    yellow: {
      card: "from-[#F7C948] to-[#F59E0B]",
      value: "text-white",
      muted: "text-white/85",
      progressTrack: "bg-white/20",
      progressFill: "bg-white",
      negative: "text-[#FFF1F2]",
    },
    red: {
      card: "from-[#FF6B6B] to-[#E53935]",
      value: "text-white",
      muted: "text-white/85",
      progressTrack: "bg-white/20",
      progressFill: "bg-white",
      negative: "text-white",
    },
  } as const;

  const weeklyTone = toneMap[store.weeklyStatus];
  const monthlyTone = toneMap[store.status];

  const getProgressWidth = (spent: number, budget: number) => {
    if (budget <= 0) return spent > 0 ? 100 : 0;
    return Math.min(100, Math.max(0, (spent / budget) * 100));
  };

  const weeklyAvailableToday = Math.min(
    Math.max(0, store.weeklyTodayAvailable),
    Math.max(0, store.weeklyRemaining),
  );

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 text-foreground">
        <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center">
          <div className="rounded-3xl border border-white/70 bg-white/80 px-5 py-4 text-center shadow-sm backdrop-blur">
            <p className="text-sm font-semibold text-foreground">
              Загружаем данные
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Проверяем локальное хранилище и восстанавливаем бюджет
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (activeTab === "history") {
    return (
      <>
        <HistoryScreen
          expenses={store.recentExpenses}
          monthlyBudget={store.monthlyBudget}
          salaryDay={store.salaryDay}
          trackingStartedAt={store.trackingStartedAt}
          currency={store.currency}
        />
        <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
      </>
    );
  }

  if (activeTab === "analytics") {
    return (
      <>
        <AnalyticsScreen />
        <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
      </>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-5 pt-safe pb-24">
      <div className="mb-6 flex items-center justify-between pt-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <h1 className="!m-0 text-xl font-bold tracking-tight">До зарплаты</h1>
        </div>

        <button
          onClick={() => setSettingsOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:text-foreground"
        >
          <Settings className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div
        ref={carouselRef}
        onScroll={handleCarouselScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="min-w-full snap-start">
          <StatusIndicator status={store.weeklyStatus} />

          <div className={cn("relative", cardClassName, weeklyTone.card)}>
            <button
              type="button"
              aria-label="Как считаются показатели недели"
              className="absolute top-4 right-4 rounded-full p-2 text-white/75 transition hover:text-white hover:bg-white/10"
              onClick={() => setShowWeeklyInfo(true)}
            >
              <Info size={18} />
            </button>

            <p className="mb-1 text-sm font-medium text-white/70">
              Остаток недели
            </p>

            <p className="text-[3.2rem] font-extrabold leading-none tracking-tighter text-white">
              {formatMoney(store.weeklyRemaining)}
            </p>

            <p className="mt-1 text-sm font-medium text-white/50">
              {currencySymbol}
            </p>

            <div className="mt-3 flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-white/40" />
              <p className="text-xs text-white/40">
                Неделя {format(store.currentWeekStart, "d MMM", { locale: ru })}{" "}
                – {format(store.currentWeekEnd, "d MMM", { locale: ru })}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-[0.95fr_1.2fr_0.95fr] items-start gap-3 border-t border-white/15 pt-5">
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/50">На сегодня</p>
                <p className="text-2xl font-bold text-white">
                  {weeklyAvailableToday > 0 ? "+" : ""}
                  {weeklyAvailableToday === 0
                    ? "0"
                    : formatMoney(weeklyAvailableToday)}
                </p>
                <p className="mt-0.5 text-[10px] text-white/35">
                  доступно сегодня
                </p>
              </div>

              <div className="min-w-0 text-center">
                <div className={cn("text-sm leading-tight", weeklyTone.muted)}>
                  {weekPlanTitle}
                </div>

                <div className="truncate whitespace-nowrap text-[1.55rem] font-semibold leading-tight text-white">
                  {weekPlanDisplay}
                </div>

                <div className={cn("text-xs leading-tight", weeklyTone.muted)}>
                  по неделе
                </div>
              </div>

              <div className="min-w-0 text-right">
                <p className="text-xs font-medium text-white/50">Потрачено</p>
                <p className="text-2xl font-bold text-white">
                  {formatMoney(store.spentToday)}
                </p>
                <p className="mt-0.5 text-[10px] leading-4 text-white/35">
                  сегодня
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-white/40">Прогресс недели</span>
                <span className="text-sm font-semibold text-white/70">
                  {formatMoney(store.weeklySpent)} /{" "}
                  {formatMoney(store.weeklyBudget)}
                </span>
              </div>

              <div
                className={cn(
                  "h-2 overflow-hidden rounded-full",
                  weeklyTone.progressTrack,
                )}
              >
                <div
                  className={cn("h-full rounded-full", weeklyTone.progressFill)}
                  style={{
                    width: `${getProgressWidth(
                      store.weeklySpent,
                      store.weeklyBudget,
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-full snap-start">
          <StatusIndicator status={store.status} />

          <div className={cn("relative", cardClassName, monthlyTone.card)}>
            <button
              type="button"
              aria-label="Как считаются показатели периода"
              className="absolute top-4 right-4 rounded-full p-2 text-white/75 transition hover:text-white hover:bg-white/10"
              onClick={() => setShowMonthlyInfo(true)}
            >
              <Info size={18} />
            </button>

            <p className="mb-1 text-sm font-medium text-white/70">
              Остаток периода
            </p>

            <p className="text-[3.2rem] font-extrabold leading-none tracking-tighter text-white">
              {formatMoney(store.remaining)}
            </p>

            <p className="mt-1 text-sm font-medium text-white/50">
              {currencySymbol}
            </p>

            <div className="mt-3 flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-white/40" />
              <p className="text-xs text-white/40">
                Зарплата{" "}
                {format(store.nextSalaryDate, "d MMMM", { locale: ru })}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-[0.95fr_1.2fr_0.95fr] items-start gap-3 border-t border-white/15 pt-5">
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/50">На сегодня</p>
                <p className="text-2xl font-bold text-white">
                  {store.todayAvailable > 0 ? "+" : ""}
                  {store.todayAvailable === 0
                    ? "0"
                    : formatMoney(store.todayAvailable)}
                </p>
                <p className="mt-0.5 text-[10px] text-white/35">
                  доступно сегодня
                </p>
              </div>

              <div className="min-w-0 text-center">
                <div className={cn("text-sm leading-tight", monthlyTone.muted)}>
                  {monthPlanTitle}
                </div>

                <div className="truncate whitespace-nowrap text-[1.55rem] font-semibold leading-tight text-white">
                  {monthPlanDisplay}
                </div>

                <div className={cn("text-xs leading-tight", monthlyTone.muted)}>
                  по периоду
                </div>
              </div>

              <div className="min-w-0 text-right">
                <p className="text-xs font-medium text-white/50">Потрачено</p>
                <p className="text-2xl font-bold text-white">
                  {formatMoney(store.totalSpentCore)}
                </p>
                <p className="mt-0.5 text-[10px] leading-4 text-white/35">
                  за период
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-white/40">Прогресс периода</span>
                <span className="text-sm font-semibold text-white/70">
                  {formatMoney(store.totalSpentCore)} /{" "}
                  {formatMoney(store.monthlyBudget)}
                </span>
              </div>

              <div
                className={cn(
                  "h-2 overflow-hidden rounded-full",
                  monthlyTone.progressTrack,
                )}
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    monthlyTone.progressFill,
                  )}
                  style={{
                    width: `${getProgressWidth(
                      store.totalSpentCore,
                      store.monthlyBudget,
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        {[0, 1].map((index) => (
          <button
            key={index}
            onClick={() => goToCard(index as 0 | 1)}
            className={cn(
              "h-2.5 w-2.5 rounded-full transition-all",
              activeCard === index ? "bg-gray-900" : "bg-gray-300",
            )}
            aria-label={index === 0 ? "Карточка недели" : "Карточка периода"}
          />
        ))}
      </div>

      <div className="mt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Быстрый расход
        </p>

        <QuickActions
          onQuickExpense={(amount) => handleExpenseAdd(amount, "other")}
          onCustom={() => setExpenseModalOpen(true)}
        />
      </div>

      <div className="mt-5">
        <RecentTransactions
          expenses={currentPeriodExpenses}
          periodTitle={currentPeriodTitle}
          currency={store.currency}
        />
      </div>

      <AddExpenseModal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onAdd={handleExpenseAdd}
        categories={store.expenseCategories}
        onAddCategory={store.addExpenseCategory}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        monthlyBudget={store.monthlyBudget}
        salaryDay={store.salaryDay}
        currency={store.currency}
        onUpdateSettings={handleSettingsSave}
      />

      {undoExpense && (
        <div className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-gray-900 px-4 py-3 text-white shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">
              Расход{" "}
              {formatMoneyWithCurrency(undoExpense.amount, store.currency)}{" "}
              добавлен
            </span>

            <button
              onClick={handleUndoExpense}
              className="shrink-0 rounded-xl bg-white/10 px-3 py-1.5 text-sm font-semibold text-white"
            >
              Отменить
            </button>
          </div>
        </div>
      )}

      {settingsUndo && (
        <div className="fixed bottom-36 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-gray-900 px-4 py-3 text-white shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">
              Новый лимит применён. В расчёт входят только сегодняшние расходы.
            </span>

            <button
              onClick={handleUndoSettings}
              className="shrink-0 rounded-xl bg-white/10 px-3 py-1.5 text-sm font-semibold text-white"
            >
              Отменить
            </button>
          </div>
        </div>
      )}

      {showWeeklyInfo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6 pt-10 sm:items-center sm:pb-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Как считаются показатели недели
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowWeeklyInfo(false)}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm text-foreground">
              <p>
                <strong>Остаток недели</strong> показывает, сколько денег сейчас
                осталось на эту неделю.
              </p>

              <p>
                Неделя считается динамически: после каждой траты приложение
                пересчитывает бюджет на оставшиеся дни до зарплаты. Поэтому
                остаток недели может уменьшаться чуть больше, чем сумма одного
                расхода.
              </p>

              <p>
                <strong>На сегодня</strong> — это сумма, которую можно потратить
                сегодня, чтобы равномерно распределить бюджет до зарплаты. Она
                считается от общего остатка периода, но не показывает больше,
                чем осталось на неделю.
              </p>

              <p>
                <strong>По неделе</strong> показывает, как вы идёте относительно
                текущего недельного плана:
              </p>

              <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                <li>
                  <strong>По плану</strong> — вы идёте по плану.
                </li>
                <li>
                  <strong>Сэкономлено</strong> — потратили меньше.
                </li>
                <li>
                  <strong>Перерасход</strong> — потратили больше.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {showMonthlyInfo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6 pt-10 sm:items-center sm:pb-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Как считаются показатели периода
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowMonthlyInfo(false)}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm text-foreground">
              <p>
                <strong>Остаток периода</strong> показывает, сколько денег
                осталось до зарплаты.
              </p>

              <p>
                После каждой траты приложение пересчитывает доступный бюджет на
                оставшиеся дни. Поэтому показатели периода меняются динамически.
              </p>

              <p>
                <strong>По периоду</strong> показывает, как вы идёте
                относительно общего плана до зарплаты:
              </p>

              <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                <li>
                  <strong>По плану</strong> — вы идёте по плану.
                </li>
                <li>
                  <strong>Сэкономлено</strong> — потратили меньше.
                </li>
                <li>
                  <strong>Перерасход</strong> — потратили больше.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
};

export default Index;
