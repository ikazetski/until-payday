import { useEffect, useState } from "react";
import {
  Dumbbell,
  Fuel,
  PartyPopper,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet";
import type { ExpenseCategory } from "@/hooks/useFinanceStore";

type AddExpenseModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (amount: number, category: ExpenseCategory) => void;
};

const categories: Array<{
  value: ExpenseCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "food", label: "Еда", icon: UtensilsCrossed },
  { value: "sport", label: "Спорт", icon: Dumbbell },
  { value: "fuel", label: "Бензин", icon: Fuel },
  { value: "entertainment", label: "Развлечения", icon: PartyPopper },
  { value: "other", label: "Другое", icon: Wallet },
];

export function AddExpenseModal({
  open,
  onClose,
  onAdd,
}: AddExpenseModalProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");

  useEffect(() => {
    if (!open) {
      setAmount("");
      setCategory("other");
    }
  }, [open]);

  const handleSubmit = () => {
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    onAdd(parsedAmount, category);
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      panelClassName="pb-8"
      contentClassName="px-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Добавить расход</h2>
        <button
          onClick={onClose}
          className="rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
        >
          Закрыть
        </button>
      </div>

      <label className="mb-4 block">
        <span className="mb-1 block text-sm text-gray-600">Сумма</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Например, 18.50"
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none"
          autoFocus
        />
      </label>

      <div className="mb-4">
        <span className="mb-2 block text-sm text-gray-600">Категория</span>

        <div className="grid grid-cols-2 gap-2">
          {categories.map((item) => {
            const Icon = item.icon;
            const isActive = category === item.value;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setCategory(item.value)}
                className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  isActive
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-sm"
      >
        Добавить
      </button>
    </BottomSheet>
  );
}