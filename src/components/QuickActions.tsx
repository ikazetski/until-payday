import { PenSquare } from "lucide-react";

type QuickActionsProps = {
  onQuickExpense: (amount: number) => void;
  onCustom: () => void;
};

const amounts = [1, 5, 10, 20, 50, 100];

export function QuickActions({ onQuickExpense, onCustom }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {amounts.map((amount) => (
        <button
          key={amount}
          onClick={() => onQuickExpense(amount)}
          className="h-12 rounded-2xl bg-white border border-gray-200 text-sm font-semibold text-gray-900 shadow-sm active:scale-[0.98] transition-transform"
        >
          -{amount}
        </button>
      ))}

      <button
        onClick={onCustom}
        className="col-span-3 h-12 rounded-2xl border border-dashed border-indigo-300 bg-indigo-50 text-sm font-semibold text-indigo-700 shadow-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
      >
        <PenSquare className="h-4 w-4" />
        Custom
      </button>
    </div>
  );
}