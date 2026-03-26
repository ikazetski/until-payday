import { useEffect, useState } from "react";
import { UtensilsCrossed, Wallet } from "lucide-react";

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

  if (!open) return null;

  const handleSubmit = () => {
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    onAdd(parsedAmount, category, note.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-md rounded-t-3xl bg-white px-5 pt-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Добавить расход</h2>
          <button
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
          >
            Закрыть
          </button>
        </div>

        <label className="block mb-3">
          <span className="block text-sm text-gray-600 mb-1">Сумма</span>
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
          <span className="block text-sm text-gray-600 mb-2">Категория</span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCategory("food")}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold border flex items-center justify-center gap-2 ${
                category === "food"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-900 border-gray-300"
              }`}
            >
              <UtensilsCrossed className="h-4 w-4" />
              Еда
            </button>

            <button
              type="button"
              onClick={() => setCategory("other")}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold border flex items-center justify-center gap-2 ${
                category === "other"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-900 border-gray-300"
              }`}
            >
              <Wallet className="h-4 w-4" />
              Другое
            </button>
          </div>
        </div>

        <label className="block">
          <span className="block text-sm text-gray-600 mb-1">Заметка</span>
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
      </div>
    </div>
  );
}