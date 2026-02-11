export type Currency = "USD" | "EUR" | "GBP";

export const CURRENCIES: { code: Currency; symbol: string; label: string }[] = [
  { code: "USD", symbol: "$", label: "USD" },
  { code: "EUR", symbol: "\u20AC", label: "EUR" },
  { code: "GBP", symbol: "\u00A3", label: "GBP" },
];

// Approximate exchange rates from USD
const RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
};

export function convertPrice(usdPrice: number, currency: Currency): number {
  return usdPrice * RATES[currency];
}

export function formatPrice(usdPrice: number, currency: Currency): string {
  const converted = convertPrice(usdPrice, currency);
  const info = CURRENCIES.find((c) => c.code === currency)!;
  return `${info.symbol}${converted.toFixed(2)}`;
}

export function detectDefaultCurrency(): Currency {
  if (typeof window === "undefined") return "USD";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const locale = navigator.language || "";
    // European timezones / locales
    if (
      tz.startsWith("Europe/") ||
      locale.startsWith("de") ||
      locale.startsWith("fr") ||
      locale.startsWith("nl") ||
      locale.startsWith("es") ||
      locale.startsWith("it") ||
      locale.startsWith("pt")
    ) {
      if (tz === "Europe/London") return "GBP";
      return "EUR";
    }
  } catch {
    // ignore
  }
  return "USD";
}
