import { useEffect, useRef, useState } from "react";
import { Settings, Plus, Wallet, CalendarDays } from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { StatusIndicator } from "@/components/StatusIndicator";
import { QuickActions } from "@/components/QuickActions";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { CustomExpenseModal } from "@/components/CustomExpenseModal";
import { SettingsSheet } from "@/components/SettingsSheet";
import { RecentTransactions } from "@/components/RecentTransactions";
import { BottomNav } from "@/components/BottomNav";
import { HistoryScreen } from "@/components/HistoryScreen";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const Index = () => {
  const store = useFinanceStore();
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [customExpenseModalOpen, setCustomExpenseModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "history">("home");
  const [undoExpense, setUndoExpense] = useState<{ id: string; amount: number } | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  const isOverBudget = store.remaining < 0;
  const isWarning = store.status === "red" || isOverBudget;
  const todayRemaining = store.dailyBudget - store.spentToday;
  const isNegativeToday = todayRemaining < 0;

  const clearUndoTimer = () => {
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
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

  const handleExpenseAdd = (amount: number, category: "food" | "other", note?: string) => {
    store.addExpense(amount, category, note);
    showUndoForLastExpense();
  };

  const handleUndoExpense = () => {
    if (!undoExpense) return;
    store.removeExpense(undoExpense.id);
    setUndoExpense(null);
    clearUndoTimer();
  };

  useEffect(() => {
    return () => clearUndoTimer();
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

  if (activeTab === "history") {
    return (
      <>
        <HistoryScreen
          expenses={store.recentExpenses}
          monthlyBudget={store.monthlyBudget}
        />
        <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-safe pb-24 max-w-md mx-auto">
      <div className="flex items-center justify-between pt-10 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight !m-0">До зарплаты</h1>
        </div>

        <button
          onClick={() => setSettingsOpen(true)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="w-[18px] h-[18px]" />
        </button>
      </div>

      <StatusIndicator status={store.status} savings={store.savings} />

      <div className={cn("kpi-card mt-5", isWarning && "kpi-card-warning")}>
        <p className="text-sm font-medium text-white/70 mb-1">Осталось</p>
        <p className="text-[3.2rem] font-extrabold tracking-tighter text-white leading-none">
          {formatMoney(store.remaining)}
        </p>
        <p className="text-sm font-medium text-white/50 mt-1">BYN</p>

        <div className="flex items-center gap-1.5 mt-3">
          <CalendarDays className="w-3.5 h-3.5 text-white/40" />
          <p className="text-xs text-white/40">
            Зарплата {format(store.nextSalaryDate, "d MMMM", { locale: ru })}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/15">
          <div>
            <p className="text-xs font-medium text-white/50">Дней</p>
            <p className="text-2xl font-bold text-white">{store.daysLeft}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-white/50">
              {isNegativeToday ? "Перерасход" : "На сегодня"}
            </p>
            <p
              className={cn(
                "text-2xl font-bold",
                isNegativeToday ? "text-red-300" : "text-white"
              )}
            >
              {isNegativeToday ? "" : "+"}
              {formatMoney(todayRemaining)}
            </p>
            <p className="text-[10px] text-white/35 mt-0.5">
              потрачено {formatMoney(store.spentToday)} · лимит {formatMoney(store.dailyBudget)}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-white/50">Отклонение</p>
            <p
              className={cn(
                "text-2xl font-bold",
                store.savings >= 0 ? "text-emerald-300" : "text-red-300"
              )}
            >
              {store.savings > 0 ? "+" : ""}
              {formatMoney(store.savings)}
            </p>
            <p className="text-[10px] text-white/35 mt-0.5">от плана</p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-white/40">Потрачено сегодня</span>
          <span
            className={cn(
              "text-sm font-semibold",
              store.spentToday > store.dailyBudget ? "text-red-300" : "text-white/70"
            )}
          >
            −{formatMoney(store.spentToday)} BYN
          </span>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Быстрый расход
        </p>
        <QuickActions
          onQuickExpense={(amt) => handleExpenseAdd(amt, "other")}
          onCustom={() => setCustomExpenseModalOpen(true)}
        />
      </div>

      <button
        onClick={() => setExpenseModalOpen(true)}
        className="w-full h-[52px] mt-3 text-[15px] font-semibold rounded-2xl gap-2 flex items-center justify-center bg-indigo-600 text-white shadow-[0_4px_16px_-4px_rgba(80,60,200,0.4)] active:scale-[0.98] transition-transform"
      >
        <Plus className="w-5 h-5" />
        Добавить расход
      </button>

      <div className="finance-card mt-5">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Фикс. расходы</span>
          <span className="font-semibold text-sm">{formatMoney(store.fixedTotal)} BYN</span>
        </div>

        <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/50">
          <span className="text-sm text-muted-foreground">Всего потрачено</span>
          <span className="font-semibold text-sm">
            {formatMoney(store.totalSpentCore + store.fixedTotal)} BYN
          </span>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Фиксированные расходы не уменьшают дневной лимит, но показываются в общем итоге.
        </p>
      </div>

      <div className="mt-5">
        <RecentTransactions expenses={store.recentExpenses} />
      </div>

      <AddExpenseModal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onAdd={handleExpenseAdd}
      />

      <CustomExpenseModal
        open={customExpenseModalOpen}
        onClose={() => setCustomExpenseModalOpen(false)}
        onAdd={(amount) => handleExpenseAdd(amount, "other")}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        monthlyBudget={store.monthlyBudget}
        salaryDay={store.salaryDay}
        fixedExpenses={store.fixedExpenses}
        onUpdateSettings={store.updateSettings}
        onAddFixed={store.addFixedExpense}
        onUpdateFixed={store.updateFixedExpense}
        onRemoveFixed={store.removeFixedExpense}
      />

      {undoExpense && (
        <div className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-gray-900 px-4 py-3 text-white shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">
              Расход {formatMoney(undoExpense.amount)} BYN добавлен
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

      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
};

export default Index;