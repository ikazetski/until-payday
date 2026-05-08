import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
} from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet";
import {
  ALWAYS_ACTIVE_CATEGORY_ID,
  MAX_ACTIVE_EXPENSE_CATEGORIES,
  MAX_TOTAL_EXPENSE_CATEGORIES,
  getActiveExpenseCategories,
  getHiddenExpenseCategories,
  hasReachedActiveCategoryLimit,
  hasReachedTotalCategoryLimit,
} from "@/domain/categoryUtils";
import { useFinanceStore, type CurrencyCode } from "@/hooks/useFinanceStore";

type SettingsSheetProps = {
  open: boolean;
  onClose: () => void;
  monthlyBudget: number;
  salaryDay: number;
  currency: CurrencyCode;
  nextSalaryDate: Date;
  onUpdateSettings: (
    monthlyBudget: number,
    salaryDay: number,
    currency: CurrencyCode,
    nextSalaryDate: Date,
  ) => void;
};

type SettingsView = "menu" | "budget" | "categories";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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

function getInitialMonthOffsetAndDay(nextSalaryDate: Date, salaryDay: number) {
  const today = startOfToday();
  const normalizedNextSalaryDate = startOfDay(nextSalaryDate);
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const nextMonth = new Date(currentYear, currentMonth + 1, 1);

  if (
    normalizedNextSalaryDate.getFullYear() === currentYear &&
    normalizedNextSalaryDate.getMonth() === currentMonth &&
    normalizedNextSalaryDate >= today
  ) {
    return { monthOffset: 0, day: normalizedNextSalaryDate.getDate() };
  }

  if (
    normalizedNextSalaryDate.getFullYear() === nextMonth.getFullYear() &&
    normalizedNextSalaryDate.getMonth() === nextMonth.getMonth()
  ) {
    return { monthOffset: 1, day: normalizedNextSalaryDate.getDate() };
  }

  const currentCandidate = new Date(
    currentYear,
    currentMonth,
    getSafeDay(currentYear, currentMonth, salaryDay),
  );

  if (currentCandidate >= today) {
    return { monthOffset: 0, day: currentCandidate.getDate() };
  }

  return {
    monthOffset: 1,
    day: getSafeDay(nextMonth.getFullYear(), nextMonth.getMonth(), salaryDay),
  };
}

export function SettingsSheet({
  open,
  onClose,
  monthlyBudget,
  salaryDay,
  currency,
  nextSalaryDate,
  onUpdateSettings,
}: SettingsSheetProps) {
  const [budgetValue, setBudgetValue] = useState(String(monthlyBudget));
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<0 | 1>(0);
  const [selectedDay, setSelectedDay] = useState(1);
  const [currencyValue, setCurrencyValue] = useState<CurrencyCode>(currency);
  const [view, setView] = useState<SettingsView>("menu");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const monthOptions = useMemo(() => getMonthOptions(), []);
  const today = startOfToday();
  const expenseCategories = useFinanceStore((state) => state.expenseCategories);
  const recentExpenses = useFinanceStore((state) => state.recentExpenses);
  const currentCycleStart = useFinanceStore((state) => state.currentCycleStart);

  const addExpenseCategory = useFinanceStore(
    (state) => state.addExpenseCategory,
  );
  const hideExpenseCategory = useFinanceStore(
    (state) => state.hideExpenseCategory,
  );
  const restoreExpenseCategory = useFinanceStore(
    (state) => state.restoreExpenseCategory,
  );
  const renameExpenseCategory = useFinanceStore(
    (state) => state.renameExpenseCategory,
  );
  const moveExpenseCategoryUp = useFinanceStore(
    (state) => state.moveExpenseCategoryUp,
  );
  const moveExpenseCategoryDown = useFinanceStore(
    (state) => state.moveExpenseCategoryDown,
  );

  const activeCategories = getActiveExpenseCategories(expenseCategories);
  const hiddenCategories = getHiddenExpenseCategories(expenseCategories);
  const activeLimitReached = hasReachedActiveCategoryLimit(expenseCategories);
  const totalLimitReached = hasReachedTotalCategoryLimit(expenseCategories);

  useEffect(() => {
    if (open) {
      const initial = getInitialMonthOffsetAndDay(nextSalaryDate, salaryDay);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBudgetValue(String(monthlyBudget));
      setSelectedMonthOffset(initial.monthOffset as 0 | 1);
      setSelectedDay(initial.day);
      setCurrencyValue(currency);
    }
  }, [open, monthlyBudget, salaryDay, currency, nextSalaryDate]);

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

  useEffect(() => {
    if (!toastMessage) return;

    const timerId = window.setTimeout(() => {
      setToastMessage(null);
    }, 2600);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [toastMessage]);

  const showToast = (message: string) => {
    setToastMessage(message);
  };
  const handleStartRenameCategory = (
    categoryId: string,
    currentName: string,
  ) => {
    setEditingCategoryId(categoryId);
    setEditingCategoryName(currentName);
    setIsAddingCategory(false);
    setNewCategoryName("");
  };

  const handleCancelRenameCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName("");
  };

  const handleRenameCategory = () => {
    if (!editingCategoryId) return;

    const trimmed = editingCategoryName.trim();

    if (!trimmed) return;

    if (trimmed.length > 12) {
      showToast("Название категории — до 12 символов.");
      return;
    }

    const success = renameExpenseCategory(editingCategoryId, trimmed);

    if (!success) {
      showToast("Не удалось переименовать категорию. Проверьте название.");
      return;
    }

    setEditingCategoryId(null);
    setEditingCategoryName("");
    showToast("Категория переименована.");
  };

  const hasCurrentPeriodExpenses = (categoryId: string) => {
    const category = expenseCategories.find((item) => item.id === categoryId);

    if (!category) return false;

    return recentExpenses.some((expense) => {
      const expenseTime = new Date(expense.createdAt).getTime();
      const expenseCategoryName = expense.categoryNameSnapshot ?? category.name;

      return (
        expense.category === categoryId &&
        expenseCategoryName === category.name &&
        expenseTime >= currentCycleStart.getTime() &&
        expenseTime < nextSalaryDate.getTime()
      );
    });
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();

    if (!trimmed) return;

    if (trimmed.length > 12) {
      showToast("Название категории — до 12 символов.");
      return;
    }

    if (totalLimitReached) {
      showToast(
        `Лимит категорий — ${MAX_TOTAL_EXPENSE_CATEGORIES}. Новые категории добавить нельзя.`,
      );
      return;
    }

    const wasLimitReached = activeLimitReached;

    addExpenseCategory(trimmed);
    setNewCategoryName("");
    setIsAddingCategory(false);
    setEditingCategoryId(null);
    setEditingCategoryName("");

    if (wasLimitReached) {
      showToast(
        "Категория добавлена в скрытые. Скройте активную категорию, чтобы вернуть новую.",
      );
      return;
    }

    showToast("Категория добавлена.");
  };

  const handleHideCategory = (categoryId: string) => {
    if (categoryId === ALWAYS_ACTIVE_CATEGORY_ID) return;

    if (hasCurrentPeriodExpenses(categoryId)) {
      showToast(
        "Нельзя скрыть категорию: в текущем периоде по ней уже есть расходы.",
      );
      return;
    }

    const success = hideExpenseCategory(categoryId);

    if (!success) {
      showToast("Не удалось скрыть категорию.");
      return;
    }

    showToast("Категория скрыта.");
  };

  const handleRestoreCategory = (categoryId: string) => {
    if (activeLimitReached) {
      showToast(
        `Лимит активных категорий — ${MAX_ACTIVE_EXPENSE_CATEGORIES}. Сначала скройте ненужную.`,
      );
      return;
    }

    const success = restoreExpenseCategory(categoryId);

    if (!success) {
      showToast("Не удалось вернуть категорию.");
      return;
    }

    showToast("Категория возвращена.");
  };

  const handleSaveSettings = () => {
    const parsedBudget = Number(budgetValue);

    if (!Number.isFinite(parsedBudget) || parsedBudget < 0) return;

    const selectedDate = new Date(
      selectedMonthMeta.year,
      selectedMonthMeta.month,
      selectedDay,
    );

    if (selectedDate < today) return;

    onUpdateSettings(parsedBudget, selectedDay, currencyValue, selectedDate);
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
              Выберите до {MAX_ACTIVE_EXPENSE_CATEGORIES} активных категорий.
              Всего можно создать до {MAX_TOTAL_EXPENSE_CATEGORIES} категорий,
              включая скрытые.
            </p>
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Активные категории
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    Показываются в попапе “Своя сумма”. Категории с расходами в
                    текущем периоде нельзя скрыть до следующего периода.
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-600">
                  {activeCategories.length}/{MAX_ACTIVE_EXPENSE_CATEGORIES}
                </span>
              </div>

              <div className="space-y-2">
                {activeCategories.map((category, index) => {
                  const isAlwaysActive =
                    category.id === ALWAYS_ACTIVE_CATEGORY_ID;
                  const canRename = !isAlwaysActive;
                  const isEditing = editingCategoryId === category.id;

                  return (
                    <div
                      key={category.id}
                      className="rounded-2xl border border-gray-200 bg-white p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {category.name}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {isAlwaysActive
                              ? "Всегда активна"
                              : category.system
                                ? "Системная категория"
                                : "Ваша категория"}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveExpenseCategoryUp(category.id)}
                            disabled={index === 0}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                            aria-label="Поднять категорию"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => moveExpenseCategoryDown(category.id)}
                            disabled={index === activeCategories.length - 1}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                            aria-label="Опустить категорию"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>

                          {canRename && (
                            <button
                              type="button"
                              onClick={() =>
                                handleStartRenameCategory(
                                  category.id,
                                  category.name,
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                              aria-label="Переименовать категорию"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}

                          {!isAlwaysActive && (
                            <button
                              type="button"
                              onClick={() => handleHideCategory(category.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                              aria-label="Скрыть категорию"
                            >
                              <EyeOff className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditing && (
                        <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                          <p className="mb-2 text-xs font-medium text-zinc-600">
                            Новое название
                          </p>

                          <div className="flex items-center gap-2">
                            <input
                              value={editingCategoryName}
                              onChange={(event) =>
                                setEditingCategoryName(event.target.value)
                              }
                              placeholder="Например: Одежда"
                              maxLength={12}
                              className="h-10 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500"
                            />

                            <button
                              type="button"
                              onClick={handleRenameCategory}
                              className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
                            >
                              OK
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={handleCancelRenameCategory}
                            className="mt-2 text-xs font-medium text-zinc-500"
                          >
                            Отмена
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3">
                {!isAddingCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      if (totalLimitReached) {
                        showToast(
                          `Лимит категорий — ${MAX_TOTAL_EXPENSE_CATEGORIES}. Новые категории добавить нельзя.`,
                        );
                        return;
                      }

                      setIsAddingCategory(true);
                      setEditingCategoryId(null);
                      setEditingCategoryName("");
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Добавить категорию
                  </button>
                )}

                {activeLimitReached &&
                  !isAddingCategory &&
                  !totalLimitReached && (
                    <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                      Активный список заполнен. Новые категории будут
                      добавляться в скрытые.
                    </p>
                  )}

                {totalLimitReached && !isAddingCategory && (
                  <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                    Достигнут общий лимит: {MAX_TOTAL_EXPENSE_CATEGORIES}{" "}
                    категорий, включая скрытые.
                  </p>
                )}

                {isAddingCategory && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <p className="mb-2 text-xs font-medium text-gray-600">
                      Новая категория
                    </p>

                    <div className="flex items-center gap-2">
                      <input
                        value={newCategoryName}
                        onChange={(event) =>
                          setNewCategoryName(event.target.value)
                        }
                        placeholder="Например: Одежда"
                        maxLength={12}
                        className="h-10 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500"
                      />

                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
                      >
                        OK
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategoryName("");
                      }}
                      className="mt-2 text-xs font-medium text-gray-500"
                    >
                      Отмена
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  Скрытые категории
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Не показываются при добавлении расхода, но остаются в истории
                  и аналитике.
                </p>
              </div>

              {hiddenCategories.length === 0 ? (
                <p className="rounded-2xl bg-gray-50 px-3 py-3 text-sm text-gray-500">
                  Скрытых категорий пока нет.
                </p>
              ) : (
                <div className="space-y-2">
                  {hiddenCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {category.name}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {category.system
                            ? "Системная категория"
                            : "Ваша категория"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestoreCategory(category.id)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-100"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Вернуть
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {toastMessage && (
        <div className="pointer-events-none sticky bottom-0 z-20 -mx-5 mt-4 px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="rounded-2xl bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
            {toastMessage}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
