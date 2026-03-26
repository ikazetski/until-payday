import { useEffect, useMemo, useState } from "react";
import { Info, Pencil, Plus, X } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { BottomSheet } from "@/components/BottomSheet";

type FixedExpense = {
  id: string;
  name: string;
  amount: number;
};

type SettingsSheetProps = {
  open: boolean;
  onClose: () => void;
  monthlyBudget: number;
  salaryDay: number;
  fixedExpenses: FixedExpense[];
  onUpdateSettings: (monthlyBudget: number, salaryDay: number) => void;
  onAddFixed: (name: string, amount: number) => void;
  onUpdateFixed: (id: string, name: string, amount: number) => void;
  onRemoveFixed: (id: string) => void;
};

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function toInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function getSafeDay(year: number, month: number, day: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(Math.max(day, 1), daysInMonth);
}

function getSelectableDateRange() {
  const today = startOfToday();
  const lastDayOfNextMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 2,
    0
  );

  return {
    min: toInputValue(today),
    max: toInputValue(lastDayOfNextMonth),
  };
}

function getDateValueFromSalaryDay(day: number) {
  const today = startOfToday();
  const year = today.getFullYear();
  const month = today.getMonth();

  const currentMonthCandidate = new Date(
    year,
    month,
    getSafeDay(year, month, day)
  );

  if (currentMonthCandidate >= today) {
    return toInputValue(currentMonthCandidate);
  }

  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonth = (month + 1) % 12;

  const nextMonthCandidate = new Date(
    nextMonthYear,
    nextMonth,
    getSafeDay(nextMonthYear, nextMonth, day)
  );

  return toInputValue(nextMonthCandidate);
}

function isWithinCurrentOrNextMonth(date: Date) {
  const today = startOfToday();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
  const nextMonth = nextMonthDate.getMonth();
  const nextMonthYear = nextMonthDate.getFullYear();

  const month = date.getMonth();
  const year = date.getFullYear();

  return (
    (month === currentMonth && year === currentYear) ||
    (month === nextMonth && year === nextMonthYear)
  );
}

export function SettingsSheet({
  open,
  onClose,
  monthlyBudget,
  salaryDay,
  fixedExpenses,
  onUpdateSettings,
  onAddFixed,
  onUpdateFixed,
  onRemoveFixed,
}: SettingsSheetProps) {
  const [budgetValue, setBudgetValue] = useState(String(monthlyBudget));
  const [salaryDateValue, setSalaryDateValue] = useState(
    getDateValueFromSalaryDay(salaryDay)
  );
  const [fixedName, setFixedName] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [editingFixedId, setEditingFixedId] = useState<string | null>(null);

  const dateRange = getSelectableDateRange();

  useEffect(() => {
    if (open) {
      setBudgetValue(String(monthlyBudget));
      setSalaryDateValue(getDateValueFromSalaryDay(salaryDay));
    }
  }, [open, monthlyBudget, salaryDay]);

  const totalFixed = useMemo(
    () => fixedExpenses.reduce((sum, item) => sum + item.amount, 0),
    [fixedExpenses]
  );

  const handleSaveSettings = () => {
    const parsedBudget = Number(budgetValue);
    const selectedDate = new Date(salaryDateValue);
    const today = startOfToday();

    if (!Number.isFinite(parsedBudget) || parsedBudget < 0) return;
    if (Number.isNaN(selectedDate.getTime())) return;
    if (selectedDate < today) return;
    if (!isWithinCurrentOrNextMonth(selectedDate)) return;

    onUpdateSettings(parsedBudget, selectedDate.getDate());
    onClose();
  };

  const resetFixedForm = () => {
    setFixedName("");
    setFixedAmount("");
    setEditingFixedId(null);
  };

  const handleSubmitFixed = () => {
    const parsedAmount = Number(fixedAmount);

    if (!fixedName.trim()) return;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    if (editingFixedId) {
      onUpdateFixed(editingFixedId, fixedName.trim(), parsedAmount);
    } else {
      onAddFixed(fixedName.trim(), parsedAmount);
    }

    resetFixedForm();
  };

  const handleStartEdit = (item: FixedExpense) => {
    setEditingFixedId(item.id);
    setFixedName(item.name);
    setFixedAmount(String(item.amount));
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      panelClassName="max-h-[90vh] overflow-hidden"
      contentClassName="max-h-[calc(90vh-28px)] overflow-y-auto px-5 pb-8"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Настройки</h2>
        <button
          onClick={onClose}
          className="rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
        >
          Закрыть
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Основные параметры
        </h3>

        <label className="mb-3 block min-w-0">
          <span className="mb-1 block text-sm text-gray-600">
            Месячный лимит
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={budgetValue}
            onChange={(e) => setBudgetValue(e.target.value)}
            className="block w-full min-w-0 max-w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block min-w-0">
          <span className="mb-1 block text-sm text-gray-600">Дата зарплаты</span>
          <input
            type="date"
            value={salaryDateValue}
            min={dateRange.min}
            max={dateRange.max}
            onChange={(e) => setSalaryDateValue(e.target.value)}
            className="date-input-fix block w-full min-w-0 max-w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-[14px] outline-none"
          />
          <span className="mt-1 block text-xs text-gray-500">
            Можно выбрать дату только в текущем или следующем месяце.
          </span>
        </label>

        <button
          onClick={handleSaveSettings}
          className="mt-4 w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-sm"
        >
          Сохранить настройки
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Фиксированные расходы
          </h3>
          <span className="shrink-0 text-xs text-gray-500">
            Всего: {formatMoney(totalFixed)} BYN
          </span>
        </div>

        <div className="mb-4 flex gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-xs text-blue-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Эти расходы не уменьшают дневной лимит, но учитываются в блоке{" "}
            <strong>«Всего потрачено»</strong>.
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <input
            type="text"
            value={fixedName}
            onChange={(e) => setFixedName(e.target.value)}
            placeholder="Название расхода"
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
          />

          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={fixedAmount}
            onChange={(e) => setFixedAmount(e.target.value)}
            placeholder="Сумма"
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
          />

          <button
            onClick={handleSubmitFixed}
            className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm"
          >
            {editingFixedId ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {editingFixedId ? "Сохранить" : "Добавить"}
          </button>

          {editingFixedId && (
            <button
              onClick={resetFixedForm}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm"
            >
              <X className="h-4 w-4" />
              Отменить редактирование
            </button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {fixedExpenses.length === 0 ? (
            <p className="text-sm text-gray-500">Пока нет фиксированных расходов</p>
          ) : (
            fixedExpenses.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatMoney(item.amount)} BYN
                  </p>
                </div>

                <div className="ml-3 flex items-center gap-2">
                  <button
                    onClick={() => handleStartEdit(item)}
                    className="rounded-xl px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                  >
                    Ред.
                  </button>
                  <button
                    onClick={() => onRemoveFixed(item.id)}
                    className="rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </BottomSheet>
  );
}