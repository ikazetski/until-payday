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