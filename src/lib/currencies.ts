export const CURRENCIES = [
  { code: "PLN", name: "Polski złoty", symbol: "zł" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "USD", name: "Dolar amerykański", symbol: "$" },
  { code: "GBP", name: "Funt brytyjski", symbol: "£" },
  { code: "CHF", name: "Frank szwajcarski", symbol: "CHF" },
  { code: "CZK", name: "Korona czeska", symbol: "Kč" },
  { code: "HUF", name: "Forint węgierski", symbol: "Ft" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

const CURRENCY_CODES = new Set<string>(CURRENCIES.map((currency) => currency.code));

export function parseCurrencyCode(value: unknown): CurrencyCode {
  return typeof value === "string" && CURRENCY_CODES.has(value) ? (value as CurrencyCode) : "PLN";
}

export function getCurrency(value: unknown) {
  const code = parseCurrencyCode(value);
  return CURRENCIES.find((currency) => currency.code === code)!;
}

export function getCurrencyLabel(value: unknown) {
  const currency = getCurrency(value);
  return `${currency.code} · ${currency.name}`;
}
