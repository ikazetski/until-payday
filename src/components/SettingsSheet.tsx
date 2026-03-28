import { useEffect, useMemo, useState } from "react";
import { Info, Pencil, Plus, X } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { BottomSheet } from "@/components/BottomSheet";
import type { CurrencyCode } from "@/hooks/useFinanceStore";

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
  currency: CurrencyCode;
  fixedExpenses: FixedExpense[];
  onUpdateSettings: (
    monthlyBudget: number,
    salaryDay: number,
    currency: CurrencyCode
  ) => void;
  onAddFixed: (name: string, amount: number) => void;
  onUpdateFixed: (id: string, name: string, amount: number) => void;
  onRemoveFixed: (id: string) => void;
};

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getSafeDay(year: number, month: number, day: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(Math.max(day, 1), daysInMonth);
}

function getMonthOptions() {
  const today = startOfToday();

  const currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  return [
    {
      key: "current",
      year: currentMonthDate.getFullYear(),
      month: currentMonthDate.getMonth(),
      label: currentMonthDate.toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric",
      }).replace(/^./, (s) => s.toUpperCase()),
    },
    {
      key: "next",
      year: nextMonthDate.getFullYear(),
      month: nextMonthDate.getMonth(),
      label: nextMonthDate.toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric",
      }).replace(/^./, (s) => s.toUpperCase()),
    },
  ] as const;
}

function getInitialMonthOffsetAndDay(salaryDay: number) {
  const today = startOfToday();
  const currentCandidate = new Date(
    today.getFullYear(),
    today.getMonth(),
    getSafeDay(today.getFullYear(), today.getMonth(), salaryDay)
  );

  if (currentCandidate >= today) {
    return {
      monthOffset: 0,
      day: currentCandidate.getDate(),
    };
  }

  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  return {
    monthOffset: 1,
    day: getSafeDay(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), salaryDay),
  };
}

export function SettingsSheet({
  open,
  onClose,
  monthlyBudget,
  salaryDay,
  currency,
  fixedExpenses,
  onUpdateSettings,
  onAddFixed,
  onUpdateFixed,
  onRemoveFixed,
}: SettingsSheetProps) {
  const [budgetValue, setBudgetValue] = useState(String(monthlyBudget));
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<0 | 1>(0);
  const [selectedDay, setSelectedDay] = useState(1);
  const [currencyValue, setCurrencyValue] = useState<CurrencyCode>(currency);

  const [fixedName, setFixedName] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [editingFixedId, setEditingFixedId] = useState<string | null>(null);

  const monthOptions = useMemo(() => getMonthOptions(), []);
  const today = startOfToday();

  useEffect(() => {
    if (open) {
      const initial = getInitialMonthOffsetAndDay(salaryDay);
      setBudgetValue(String(monthlyBudget));
      setSelectedMonthOffset(initial.monthOffset as 0 | 1);
      setSelectedDay(initial.day);
      setCurrencyValue(currency);
    }
  }, [open, monthlyBudget, salaryDay]);

  const selectedMonthMeta = monthOptions[selectedMonthOffset];
  const daysInSelectedMonth = new Date(
    selectedMonthMeta.year,
    selectedMonthMeta.month + 1,
    0
  ).getDate();

  const dayOptions = Array.from({ length: daysInSelectedMonth }, (_, index) => index + 1);

  useEffect(() => {
    if (selectedDay > daysInSelectedMonth) {
      setSelectedDay(daysInSelectedMonth);
      setCurrencyValue(currency);
    }
  }, [selectedDay, daysInSelectedMonth]);

  const totalFixed = useMemo(
    () => fixedExpenses.reduce((sum, item) => sum + item.amount, 0),
    [fixedExpenses]
  );

  const handleSaveSettings = () => {
    const parsedBudget = Number(budgetValue);

    if (!Number.isFinite(parsedBudget) || parsedBudget < 0) return;

    const selectedDate = new Date(
      selectedMonthMeta.year,
      selectedMonthMeta.month,
      selectedDay
    );

    if (selectedDate < today) return;

    onUpdateSettings(parsedBudget, selectedDay, currencyValue);
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

        <label className="mb-3 block min-w-0">
          <span className="mb-1 block text-sm text-gray-600">Валюта</span>
          <select
            value={currencyValue}
            onChange={(e) => setCurrencyValue(e.target.value as CurrencyCode)}
            className="block w-full min-w-0 max-w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
          >
            <option value="BYN">BYN</option>
            <option value="EUR">€ Euro</option>
            <option value="USD">$ USD</option>
            <option value="RUB">₽ RUB</option>
            <option value="UAH">₴ UAH</option>
          </select>
        </label>

        <div className="block min-w-0">
          <span className="mb-1 block text-sm text-gray-600">Дата зарплаты</span>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={selectedMonthOffset}
              onChange={(e) => setSelectedMonthOffset(Number(e.target.value) as 0 | 1)}
              className="block w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
            >
              {monthOptions.map((option, index) => (
                <option key={option.key} value={index}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="block w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
            >
              {dayOptions.map((day) => {
                const optionDate = new Date(
                  selectedMonthMeta.year,
                  selectedMonthMeta.month,
                  day
                );
                const disabled = optionDate < today;

                return (
                  <option key={day} value={day} disabled={disabled}>
                    {day}
                  </option>
                );
              })}
            </select>
          </div>

          <span className="mt-1 block text-xs text-gray-500">
            Можно выбрать только текущий или следующий месяц.
          </span>
        </div>

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