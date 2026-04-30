import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { BottomSheet } from "@/components/BottomSheet";
import {
  getActiveExpenseCategories,
  hasReachedActiveCategoryLimit,
} from "@/domain/categoryUtils";
import type { ExpenseCategoryItem } from "@/hooks/useFinanceStore";

type AddExpenseModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (amount: number, category: string) => void;
  categories: ExpenseCategoryItem[];
  onAddCategory: (name: string) => void;
};

function normalizeCategoryName(value: string) {
  return value.trim().toLowerCase();
}

function resolveCategoryEmoji(name: string) {
  const normalized = normalizeCategoryName(name);

  const rules: Array<{ keywords: string[]; emoji: string }> = [
    { keywords: ["кофе", "кофейн", "латте", "капучино"], emoji: "☕" },
    { keywords: ["чай"], emoji: "🍵" },
    { keywords: ["аптека", "лекар", "таблет", "витамин"], emoji: "💊" },
    { keywords: ["такси", "uber", "bolt"], emoji: "🚕" },
    { keywords: ["продукт", "магазин", "супермаркет"], emoji: "🛒" },
    { keywords: ["кафе", "ресторан", "еда", "обед", "ужин"], emoji: "🍽️" },
    { keywords: ["топливо", "бензин", "азс"], emoji: "⛽" },
    { keywords: ["спорт", "зал", "трен", "фитнес"], emoji: "🏋️" },
    { keywords: ["кино", "развлеч", "игры"], emoji: "🎬" },
    { keywords: ["живот", "кот", "собак", "вет"], emoji: "🐾" },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.emoji;
    }
  }

  return null;
}

function getCategoryVisual(category: ExpenseCategoryItem) {
  const systemMap: Record<string, string> = {
    food: "🍔",
    sport: "🏋️",
    fuel: "⛽",
    entertainment: "🎬",
    other: "•",
  };

  if (category.system) {
    return systemMap[category.id] ?? "•";
  }

  const emoji = resolveCategoryEmoji(category.name);
  if (emoji) return emoji;

  return category.name.charAt(0).toUpperCase();
}

export function AddExpenseModal({
  open,
  onClose,
  onAdd,
  categories,
  onAddCategory,
}: AddExpenseModalProps) {
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("other");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAmount("");
      setSelectedCategory("other");
      setIsAddingCategory(false);
      setNewCategoryName("");
    }
  }, [open]);

  const canSubmit = useMemo(() => {
    const parsed = Number(amount.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0;
  }, [amount]);

  const activeCategories = getActiveExpenseCategories(categories);
  const canAddCategory = !hasReachedActiveCategoryLimit(categories);

  const handleSubmit = () => {
    const parsed = Number(amount.replace(",", "."));

    if (!Number.isFinite(parsed) || parsed <= 0) return;

    onAdd(parsed, selectedCategory);
    onClose();
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();

    if (!trimmed || trimmed.length > 14) return;
    if (!canAddCategory) return;

    onAddCategory(trimmed);
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  const handleCancelAddCategory = () => {
    setIsAddingCategory(false);
    setNewCategoryName("");
  };

  if (!open) return null;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      panelClassName="max-h-[90vh] overflow-hidden"
      contentClassName="max-h-[calc(90vh-28px)] overflow-y-auto px-5 pb-0"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Своя сумма</h2>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
        >
          Закрыть
        </button>
      </div>

      <div className="space-y-4 pb-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-900">
            Сумма
          </label>

          <input
            autoFocus
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Введите сумму"
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base text-zinc-900 outline-none transition focus:border-indigo-500"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-zinc-900">
              Категория
            </label>

            <span className="shrink-0 text-xs text-zinc-500">
              Активные: {activeCategories.length}/10
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeCategories.map((category) => {
              const selected = selectedCategory === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition",
                    selected
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-zinc-200 bg-white text-zinc-900",
                  )}
                >
                  <span className="text-sm">{getCategoryVisual(category)}</span>
                  <span>{category.name}</span>
                </button>
              );
            })}

            {canAddCategory && !isAddingCategory && (
              <button
                type="button"
                onClick={() => setIsAddingCategory(true)}
                className="inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-zinc-300 px-3 text-sm text-zinc-500 transition hover:text-zinc-900"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Новая</span>
              </button>
            )}

            {!canAddCategory && (
              <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                Лимит — 10 активных категорий. Чтобы добавить новую, скройте
                ненужную категорию в настройках.
              </div>
            )}
          </div>

          {isAddingCategory && (
            <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="mb-2 text-xs font-medium text-zinc-600">
                Новая категория
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Например: Кофе"
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
                onClick={handleCancelAddCategory}
                className="mt-2 text-xs font-medium text-zinc-500"
              >
                Отмена
              </button>
            </div>
          )}

          <p className="mt-2 text-xs text-zinc-500">
            {canAddCategory
              ? "Можно показывать до 10 активных категорий. Название — до 12 символов."
              : "Чтобы добавить новую категорию, скройте ненужную в настройках."}
          </p>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-5 border-t border-zinc-100 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            "flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold transition",
            canSubmit
              ? "bg-indigo-600 text-white"
              : "bg-zinc-100 text-zinc-400",
          )}
        >
          Сохранить расход
        </button>
      </div>
    </BottomSheet>
  );
}
