import { useEffect, useMemo, useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import type { CurrencyCode } from "@/hooks/useFinanceStore";
import { ArrowLeft, ChevronRight } from "lucide-react";

type SettingsSheetProps = {
  open: boolean;
  onClose: () => void;
  monthlyBudget: number;
  salaryDay: number;
  currency: CurrencyCode;
  onUpdateSettings: (
    monthlyBudget: number,
    salaryDay: number,
    currency: CurrencyCode,
  ) => void;
};

type SettingsView = "menu" | "budget" | "categories";

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
      label: currentMonthDate
        .toLocaleDateString("ru-RU", {
          month: "long",
          year: "numeric",
        })
        .replace(/^./, (s) => s.toUpperCase()),
    },
    {
      key: "next",
      year: nextMonthDate.getFullYear(),
      month: nextMonthDate.getMonth(),
      label: nextMonthDate
        .toLocaleDateString("ru-RU", {
          month: "long",
          year: "numeric",
        })
        .replace(/^./, (s) => s.toUpperCase()),
    },
  ] as const;
}

function getInitialMonthOffsetAndDay(salaryDay: number) {
  const today = startOfToday();
  const currentCandidate = new Date(
    today.getFullYear(),
    today.getMonth(),
    getSafeDay(today.getFullYear(), today.getMonth(), salaryDay),
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
    day: getSafeDay(
      nextMonthDate.getFullYear(),
      nextMonthDate.getMonth(),
      salaryDay,
    ),
  };
}

export function SettingsSheet({
  open,
  onClose,
  monthlyBudget,
  salaryDay,
  currency,
  onUpdateSettings,
}: SettingsSheetProps) {
  const [budgetValue, setBudgetValue] = useState(String(monthlyBudget));
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<0 | 1>(0);
  const [selectedDay, setSelectedDay] = useState(1);
  const [currencyValue, setCurrencyValue] = useState<CurrencyCode>(currency);
  const [view, setView] = useState<SettingsView>("menu");

  const monthOptions = useMemo(() => getMonthOptions(), []);
  const today = startOfToday();

  useEffect(() => {
    if (open) {
      const initial = getInitialMonthOffsetAndDay(salaryDay);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBudgetValue(String(monthlyBudget));
      setSelectedMonthOffset(initial.monthOffset as 0 | 1);
      setSelectedDay(initial.day);
      setCurrencyValue(currency);
      setView("menu");
    }
  }, [open, monthlyBudget, salaryDay, currency]);

  const selectedMonthMeta = monthOptions[selectedMonthOffset];
  const daysInSelectedMonth = new Date(
    selectedMonthMeta.year,
    selectedMonthMeta.month + 1,
    0,
  ).getDate();

  const dayOptions = Array.from(
    { length: daysInSelectedMonth },
    (_, index) => index + 1,
  );

  useEffect(() => {
    if (selectedDay > daysInSelectedMonth) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDay(daysInSelectedMonth);
    }
  }, [selectedDay, daysInSelectedMonth]);

  const handleSaveSettings = () => {
    const parsedBudget = Number(budgetValue);

    if (!Number.isFinite(parsedBudget) || parsedBudget < 0) return;

    const selectedDate = new Date(
      selectedMonthMeta.year,
      selectedMonthMeta.month,
      selectedDay,
    );

    if (selectedDate < today) return;

    onUpdateSettings(parsedBudget, selectedDay, currencyValue);
    onClose();
  };

  const handleClose = () => {
    setView("menu");
    onClose();
  };

  const isCategoriesView = view === "categories";

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      panelClassName={
        isCategoriesView
          ? "max-h-[92vh] overflow-hidden"
          : "max-h-[86vh] overflow-hidden"
      }
      contentClassName={
        isCategoriesView
          ? "max-h-[calc(92vh-28px)] overflow-y-auto px-5 pb-8"
          : "max-h-[calc(86vh-28px)] overflow-y-auto px-5 pb-8"
      }
    >
      {view === "menu" && (
        <>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Настройки</h2>

            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
            >
              Закрыть
            </button>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setView("budget")}
              className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-left transition hover:bg-gray-100"
            >
              <span>
                <span className="block text-sm font-semibold text-gray-900">
                  Бюджет и зарплата
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  Лимит, валюта и дата зарплаты
                </span>
              </span>

              <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
            </button>

            <button
              type="button"
              onClick={() => setView("categories")}
              className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-left transition hover:bg-gray-100"
            >
              <span>
                <span className="block text-sm font-semibold text-gray-900">
                  Категории расходов
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  Настройте категории для быстрого добавления
                </span>
              </span>

              <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
            </button>
          </div>
        </>
      )}

      {view === "budget" && (
        <>
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setView("menu")}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Назад"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
            >
              Закрыть
            </button>
          </div>

          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Бюджет и зарплата
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Лимит, валюта и дата следующей зарплаты.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
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
                onChange={(e) =>
                  setCurrencyValue(e.target.value as CurrencyCode)
                }
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
              <span className="mb-1 block text-sm text-gray-600">
                Дата зарплаты
              </span>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedMonthOffset}
                  onChange={(e) =>
                    setSelectedMonthOffset(Number(e.target.value) as 0 | 1)
                  }
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
                      day,
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
              type="button"
              onClick={handleSaveSettings}
              className="mt-4 w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-sm"
            >
              Сохранить настройки
            </button>
          </div>
        </>
      )}

      {view === "categories" && (
        <>
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setView("menu")}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Назад"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
            >
              Закрыть
            </button>
          </div>

          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Категории расходов
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              Выберите до 10 категорий, которые будут показываться при
              добавлении расхода.
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">
              Управление категориями будет здесь
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              На следующем шаге добавим активные и скрытые категории,
              добавление, переименование, стрелки вверх/вниз и возврат из
              скрытых.
            </p>
          </div>
        </>
      )}
    </BottomSheet>
  );
}
