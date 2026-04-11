import { useEffect, useMemo, useRef, useState } from "react";
import { Settings, Wallet, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import {
  cn,
  formatMoney,
  formatMoneyWithCurrency,
  getCurrencySymbol,
} from "@/lib/utils";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { QuickActions } from "@/components/QuickActions";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { StatusIndicator } from "@/components/StatusIndicator";
import { SettingsSheet } from "@/components/SettingsSheet";
import { RecentTransactions } from "@/components/RecentTransactions";
import { BottomNav } from "@/components/BottomNav";
import { HistoryScreen } from "@/components/HistoryScreen";

const Index = () => {
  const store = useFinanceStore();

  const currencySymbol = getCurrencySymbol(store.currency);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "history">("home");
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

  const handleExpenseAdd = (amount: number, category: string) => {
    store.addExpense(amount, category);
    showUndoForLastExpense();
  };

  const handleSettingsSave = (
    monthlyBudget: number,
    salaryDay: number,
    currency: typeof store.currency
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
  }, []);

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

  const currentPeriodExpenses = activeCard === 0 ? weekExpenses : cycleExpenses;

  const currentPeriodTitle =
    activeCard === 0
      ? `${format(store.currentWeekStart, "d MMM", { locale: ru })} – ${format(
          store.currentWeekEnd,
          "d MMM",
          { locale: ru }
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

  const weeklyOverspend =
    store.weeklyRemaining < 0 ? Math.abs(store.weeklyRemaining) : 0;

  const monthlyOverspend =
    store.remaining < 0 ? Math.abs(store.remaining) : 0;

  const weekPlanTitle = weeklyOverspend > 0 ? "Перерасход" : "По плану";
  const weekPlanDisplay =
    weeklyOverspend > 0 ? `-${formatMoney(weeklyOverspend)}` : "0,00";

  const monthPlanTitle = monthlyOverspend > 0 ? "Перерасход" : "По плану";
  const monthPlanDisplay =
    monthlyOverspend > 0 ? `-${formatMoney(monthlyOverspend)}` : "0,00";

  const cardClassName =
    "rounded-[32px] bg-gradient-to-br px-6 pt-5 pb-4 shadow-lg min-h-[330px]";

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
          <StatusIndicator
            status={store.weeklyStatus}
          />

          <div className={cn(cardClassName, weeklyTone.card)}>
            <p className="mb-1 text-sm font-medium text-white/70">Остаток недели</p>

            <p className="text-[3.2rem] font-extrabold leading-none tracking-tighter text-white">
              {formatMoney(store.weeklyRemaining)}
            </p>

            <p className="mt-1 text-sm font-medium text-white/50">{currencySymbol}</p>

            <div className="mt-3 flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-white/40" />
              <p className="text-xs text-white/40">
                Неделя {format(store.currentWeekStart, "d MMM", { locale: ru })} –{" "}
                {format(store.currentWeekEnd, "d MMM", { locale: ru })}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-4 border-t border-white/15 pt-5">
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/50">На сегодня</p>
                <p className="text-2xl font-bold text-white">
                  {store.weeklyTodayAvailable > 0 ? "+" : ""}
                  {store.weeklyTodayAvailable === 0
                    ? "0"
                    : formatMoney(store.weeklyTodayAvailable)}
                </p>
                <p className="mt-0.5 text-[10px] text-white/35">доступно сегодня</p>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium text-white/50">{weekPlanTitle}</p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    weeklyOverspend > 0 ? weeklyTone.negative : "text-white"
                  )}
                >
                  {weekPlanDisplay}
                </p>
                <p className="mt-0.5 text-[10px] text-white/35">по неделе</p>
              </div>

              <div className="min-w-0">
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
                  {formatMoney(store.weeklySpent)} / {formatMoney(store.weeklyBudget)}
                </span>
              </div>

              <div className={cn("h-2 overflow-hidden rounded-full", weeklyTone.progressTrack)}>
                <div
                  className={cn("h-full rounded-full", weeklyTone.progressFill)}
                  style={{
                    width: `${getProgressWidth(store.weeklySpent, store.weeklyBudget)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-full snap-start">
          <StatusIndicator
            status={store.status}
          />

          <div className={cn(cardClassName, monthlyTone.card)}>
            <p className="mb-1 text-sm font-medium text-white/70">Остаток периода</p>

            <p className="text-[3.2rem] font-extrabold leading-none tracking-tighter text-white">
              {formatMoney(store.remaining)}
            </p>

            <p className="mt-1 text-sm font-medium text-white/50">{currencySymbol}</p>

            <div className="mt-3 flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-white/40" />
              <p className="text-xs text-white/40">
                Зарплата {format(store.nextSalaryDate, "d MMMM", { locale: ru })}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/15 pt-5">
              <div>
                <p className="text-xs font-medium text-white/50">Дней</p>
                <p className="text-2xl font-bold text-white">{store.daysLeft}</p>
                <p className="mt-0.5 text-[10px] text-white/35">до зарплаты</p>
              </div>

              <div>
                <p className="text-xs font-medium text-white/50">{monthPlanTitle}</p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    monthlyOverspend > 0 ? monthlyTone.negative : "text-white"
                  )}
                >
                  {monthPlanDisplay}
                </p>
                <p className="mt-0.5 text-[10px] text-white/35">по периоду</p>
              </div>
            </div>

            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-white/40">Прогресс периода</span>
                <span className="text-sm font-semibold text-white/70">
                  {formatMoney(store.totalSpentCore)} / {formatMoney(store.monthlyBudget)}
                </span>
              </div>

              <div
                className={cn("h-2 overflow-hidden rounded-full", monthlyTone.progressTrack)}
              >
                <div
                  className={cn("h-full rounded-full", monthlyTone.progressFill)}
                  style={{
                    width: `${getProgressWidth(
                      store.totalSpentCore,
                      store.monthlyBudget
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
              activeCard === index ? "bg-gray-900" : "bg-gray-300"
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

      <div className="finance-card mt-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Фикс. расходы</span>
          <span className="text-sm font-semibold">
            {formatMoneyWithCurrency(store.fixedTotal, store.currency)}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
          <span className="text-sm text-muted-foreground">Всего потрачено</span>
          <span className="text-sm font-semibold">
            {formatMoneyWithCurrency(
              store.totalSpentCore + store.fixedTotal,
              store.currency
            )}
          </span>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Фиксированные расходы не уменьшают дневной лимит, но показываются в общем
          итоге.
        </p>
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
        fixedExpenses={store.fixedExpenses}
        onUpdateSettings={handleSettingsSave}
        onAddFixed={store.addFixedExpense}
        onUpdateFixed={store.updateFixedExpense}
        onRemoveFixed={store.removeFixedExpense}
      />

      {undoExpense && (
        <div className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-gray-900 px-4 py-3 text-white shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">
              Расход {formatMoneyWithCurrency(undoExpense.amount, store.currency)} добавлен
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

      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
};

export default Index;