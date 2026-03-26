import { useState } from "react";
import { Settings, Plus, Wallet, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { StatusIndicator } from "@/components/StatusIndicator";
import { QuickActions } from "@/components/QuickActions";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { SettingsSheet } from "@/components/SettingsSheet";
import { RecentTransactions } from "@/components/RecentTransactions";
import { BottomNav } from "@/components/BottomNav";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const Index = () => {
  const store = useFinanceStore();
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isOverBudget = store.remaining < 0;
  const isWarning = store.status === "red" || isOverBudget;

  return (
    <div className="min-h-screen bg-background px-5 pt-safe pb-24 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pt-10 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">До зарплаты</h1>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* Status indicator */}
      <StatusIndicator status={store.status} savings={store.savings} />

      {/* Primary KPI — gradient hero card */}
      <div className={cn("kpi-card mt-5", isWarning && "kpi-card-warning")}>
        <p className="text-sm font-medium text-white/70 mb-1">Осталось</p>
        <p className="text-[3.2rem] font-extrabold tracking-tighter text-white leading-none">
          {store.remaining.toLocaleString("ru-RU")}
        </p>
        <p className="text-sm font-medium text-white/50 mt-1">BYN</p>

        {/* Salary date line */}
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
            {(() => {
              const todayRemaining = store.dailyBudget - store.spentToday;
              const isNegative = todayRemaining < 0;
              return (
                <>
                  <p className="text-xs font-medium text-white/50">
                    {isNegative ? "Перерасход" : "На сегодня"}
                  </p>
                  <p className={cn(
                    "text-2xl font-bold",
                    isNegative ? "text-red-300" : "text-white"
                  )}>
                    {isNegative ? "" : "+"}{Math.round(todayRemaining).toLocaleString("ru-RU")}
                  </p>
                  <p className="text-[10px] text-white/35 mt-0.5">
                    потрачено {store.spentToday.toLocaleString("ru-RU")} · лимит {store.dailyBudget.toLocaleString("ru-RU")}
                  </p>
                </>
              );
            })()}
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
              {store.savings.toLocaleString("ru-RU")}
            </p>
            <p className="text-[10px] text-white/35 mt-0.5">от плана</p>
          </div>
        </div>

        {/* Spent today */}
        {store.spentToday > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-white/40">Потрачено сегодня</span>
            <span className={cn(
              "text-sm font-semibold",
              store.spentToday > store.dailyBudget ? "text-red-300" : "text-white/70"
            )}>
              −{store.spentToday.toLocaleString("ru-RU")} BYN
            </span>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Быстрый расход
        </p>
        <QuickActions onQuickExpense={(amt) => store.addExpense(amt, "other")} />
      </div>

      {/* Custom expense button */}
      <button
        onClick={() => setExpenseModalOpen(true)}
        className="w-full h-[52px] mt-3 text-[15px] font-semibold rounded-2xl gap-2 flex items-center justify-center bg-primary text-primary-foreground shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.4)] active:scale-[0.98] transition-transform"
      >
        <Plus className="w-5 h-5" />
        Добавить расход
      </button>

      {/* Secondary info */}
      <div className="finance-card mt-5">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Фикс. расходы</span>
          <span className="font-semibold text-sm">{store.fixedTotal.toLocaleString("ru-RU")} BYN</span>
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/50">
          <span className="text-sm text-muted-foreground">Всего потрачено</span>
          <span className="font-semibold text-sm">
            {(store.totalSpentCore + store.fixedTotal).toLocaleString("ru-RU")} BYN
          </span>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="mt-5">
        <RecentTransactions expenses={store.recentExpenses} />
      </div>

      {/* Modals */}
      <AddExpenseModal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onAdd={store.addExpense}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        monthlyBudget={store.monthlyBudget}
        salaryDay={store.salaryDay}
        fixedExpenses={store.fixedExpenses}
        onUpdateSettings={store.updateSettings}
        onAddFixed={store.addFixedExpense}
        onRemoveFixed={store.removeFixedExpense}
      />

      <BottomNav />
    </div>
  );
};

export default Index;
