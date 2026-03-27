import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";

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

  const handleSubmit = () => {
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    onAdd(parsedAmount);
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
        <h2 className="text-lg font-bold text-gray-900">Своя сумма</h2>
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
          placeholder="Введите сумму"
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none"
          autoFocus
        />
      </label>

      <button
        onClick={handleSubmit}
        className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm"
      >
        Добавить
      </button>
    </BottomSheet>
  );
}