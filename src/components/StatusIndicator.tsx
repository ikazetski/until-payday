import { formatMoneyWithCurrency } from "@/lib/utils";
import type { CurrencyCode } from "@/hooks/useFinanceStore";

type Status = "green" | "yellow" | "red";

type StatusIndicatorProps = {
  status: Status;
  savings?: number;
  currency: CurrencyCode;
  period: "week" | "month";
};

const statusConfig = {
  green: {
    title: "Ты в рамках бюджета",
    textColor: "text-emerald-700",
    activeTrack: "bg-emerald-500",
    activeIndex: 0,
  },
  yellow: {
    title: "Есть риск выйти за план",
    textColor: "text-amber-700",
    activeTrack: "bg-amber-500",
    activeIndex: 1,
  },
  red: {
    title: "Бюджет превышен",
    textColor: "text-red-600",
    activeTrack: "bg-red-500",
    activeIndex: 2,
  },
} as const;

export function StatusIndicator({
  status,
  savings = 0,
  currency,
  period,
}: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className="px-1">
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`h-2 rounded-full ${
              config.activeIndex === index ? config.activeTrack : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <div className="mt-3">
        <p className={`text-sm font-semibold ${config.textColor}`}>
          {config.title} {status === "red" ? "⚠️" : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {savings >= 0 ? "Сэкономлено" : "Перерасход"}{" "}
          {period === "week" ? "по неделе" : "по периоду"}:{" "}
          {savings > 0 ? "+" : ""}
          {formatMoneyWithCurrency(savings, currency)}
        </p>
      </div>
    </div>
  );
}