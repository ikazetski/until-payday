export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatMoney(value: number) {
  const normalized = Math.abs(value) < 0.005 ? 0 : value;

  return normalized.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getCurrencySymbol(currency: "BYN" | "EUR" | "USD" | "RUB" | "UAH") {
  switch (currency) {
    case "EUR":
      return "€";
    case "USD":
      return "$";
    case "RUB":
      return "₽";
    case "UAH":
      return "₴";
    case "BYN":
    default:
      return "BYN";
  }
}

export function formatMoneyWithCurrency(
  value: number,
  currency: "BYN" | "EUR" | "USD" | "RUB" | "UAH"
) {
  return `${formatMoney(value)} ${getCurrencySymbol(currency)}`;
}
import {
  Dumbbell,
  Fuel,
  PartyPopper,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ExpenseCategory, ExpenseCategoryItem } from "@/hooks/useFinanceStore";

export function getExpenseCategoryName(
  category: ExpenseCategory,
  categories: ExpenseCategoryItem[]
): string {
  const match = categories.find((item) => item.id === category);

  if (match) {
    return match.name;
  }

  switch (category) {
    case "food":
      return "Еда";
    case "sport":
      return "Спорт";
    case "fuel":
      return "Бензин";
    case "entertainment":
      return "Развлечения";
    default:
      return "Другое";
  }
}

export function getExpenseCategoryIcon(category: ExpenseCategory): LucideIcon {
  switch (category) {
    case "food":
      return UtensilsCrossed;
    case "sport":
      return Dumbbell;
    case "fuel":
      return Fuel;
    case "entertainment":
      return PartyPopper;
    default:
      return Wallet;
  }
}