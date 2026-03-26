import { useEffect, useState } from "react";
import { UtensilsCrossed, Wallet } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet";

type ExpenseCategory = "food" | "other";

type AddExpenseModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (amount: number, category: ExpenseCategory, note?: string) => void;
};

export function AddExpenseModal({
  open,
  onClose,
  onAdd,
}: AddExpenseModalProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) {
      setAmount("");
      setCategory("other");
      setNote("");
    }
  }, [open]);

  const handleSubmit = () => {
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    onAdd(parsedAmount, category, note.trim() || undefined);
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

      <label className="mb-3 block">
        <span className="mb-1 block text-sm text-gray-600">Сумма</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Например, 12.50"
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none"
        />
      </label>

      <div className="mb-3">
        <span className="mb-2 block text-sm text-gray-600">Категория</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCategory("food")}
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${
              category === "food"
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 bg-white text-gray-900"
            }`}
          >
            <UtensilsCrossed className="h-4 w-4" />
            Еда
          </button>

          <button
            type="button"
            onClick={() => setCategory("other")}
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${
              category === "other"
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 bg-white text-gray-900"
            }`}
          >
            <Wallet className="h-4 w-4" />
            Другое
          </button>
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Заметка</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Необязательно"
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none"
        />
      </label>

      <button
        onClick={handleSubmit}
        className="mt-5 w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-sm"
      >
        Сохранить расход
      </button>
    </BottomSheet>
  );
}