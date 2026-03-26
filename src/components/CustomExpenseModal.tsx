import { useEffect, useState } from "react";

type CustomExpenseModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (amount: number) => void;
};

export function CustomExpenseModal({
  open,
  onClose,
  onAdd,
}: CustomExpenseModalProps) {
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!open) {
      setAmount("");
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    onAdd(parsedAmount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-md rounded-t-3xl bg-white px-5 pt-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Custom расход</h2>
          <button
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
          >
            Закрыть
          </button>
        </div>

        <label className="block mb-4">
          <span className="block text-sm text-gray-600 mb-1">Сумма</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Введите сумму"
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none"
          />
        </label>

        <button
          onClick={handleSubmit}
          className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm"
        >
          Добавить
        </button>
      </div>
    </div>
  );
}