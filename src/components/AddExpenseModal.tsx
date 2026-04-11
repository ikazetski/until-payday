import { useEffect, useMemo, useState } from "react";
import { X, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
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

  const canAddCategory = categories.length < 5;

  const handleSubmit = () => {
    const parsed = Number(amount.replace(",", "."));

    if (!Number.isFinite(parsed) || parsed <= 0) return;

    onAdd(parsed, selectedCategory);
    onClose();
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();

    if (!trimmed || trimmed.length > 12) return;

    onAddCategory(trimmed);
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40">
      <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-background px-5 pb-6 pt-4 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Своя сумма</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Сумма
            </label>
            <input
              autoFocus
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Введите сумму"
              className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none transition focus:border-indigo-500"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Категория</label>
              <span className="text-xs text-muted-foreground">
                {categories.length}/5
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
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
                        : "border-border bg-background text-foreground"
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
                  className="inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-border px-3 text-sm text-muted-foreground transition hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Добавить</span>
                </button>
              )}
            </div>

            {isAddingCategory && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Новая категория"
                  maxLength={12}
                  className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
                >
                  OK
                </button>
              </div>
            )}

            <p className="mt-2 text-xs text-muted-foreground">
              До 5 категорий, название до 12 символов
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "mt-2 flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold transition",
              canSubmit
                ? "bg-indigo-600 text-white"
                : "bg-secondary text-muted-foreground"
            )}
          >
            Сохранить расход
          </button>
        </div>
      </div>
    </div>
  );
}