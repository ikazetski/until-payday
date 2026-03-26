import { useEffect, useMemo, useState } from "react";
import { Info, Pencil, Plus, X } from "lucide-react";
import { formatMoney } from "@/lib/utils";

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

function getNextMonthDateRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0);

  const toInputValue = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;

  return {
    min: toInputValue(firstDay),
    max: toInputValue(lastDay),
  };
}

function getDateValueFromSalaryDay(day: number) {
  const now = new Date();
  const target = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    Math.min(Math.max(day, 1), 28)
  );

  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(
    target.getDate()
  ).padStart(2, "0")}`;
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
  const [salaryDateValue, setSalaryDateValue] = useState(getDateValueFromSalaryDay(salaryDay));
  const [fixedName, setFixedName] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [editingFixedId, setEditingFixedId] = useState<string | null>(null);

  const dateRange = getNextMonthDateRange();

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

  if (!open) return null;

  const handleSaveSettings = () => {
    const parsedBudget = Number(budgetValue);
    const date = new Date(salaryDateValue);

    if (!Number.isFinite(parsedBudget) || parsedBudget < 0) return;
    if (Number.isNaN(date.getTime())) return;

    onUpdateSettings(parsedBudget, date.getDate());
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-md rounded-t-3xl bg-white px-5 pt-5 pb-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Настройки</h2>
          <button
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
          >
            Закрыть
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Основные параметры</h3>

          <label className="block mb-3">
            <span className="block text-sm text-gray-600 mb-1">Месячный лимит</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={budgetValue}
              onChange={(e) => setBudgetValue(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
            />
          </label>

          <label className="block">
            <span className="block text-sm text-gray-600 mb-1">Дата зарплаты</span>
            <input
              type="date"
              value={salaryDateValue}
              min={dateRange.min}
              max={dateRange.max}
              onChange={(e) => setSalaryDateValue(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
            />
            <span className="mt-1 block text-xs text-gray-500">
              Можно выбрать только дату следующей зарплаты в следующем месяце.
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
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Фиксированные расходы</h3>
            <span className="text-xs text-gray-500">Всего: {formatMoney(totalFixed)} BYN</span>
          </div>

          <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-3 text-xs text-blue-800 flex gap-2 mb-4">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Эти расходы не уменьшают дневной лимит, но учитываются в блоке
              <strong> «Всего потрачено»</strong>.
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
              className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm flex items-center justify-center gap-2"
            >
              {editingFixedId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingFixedId ? "Сохранить" : "Добавить"}
            </button>

            {editingFixedId && (
              <button
                onClick={resetFixedForm}
                className="rounded-2xl bg-white border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm flex items-center justify-center gap-2"
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
                  className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{formatMoney(item.amount)} BYN</p>
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
      </div>
    </div>
  );
}