import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: "TL" | "USD" | "EUR" = "TL"): string {
  const localeMap = { TL: "tr-TR", USD: "en-US", EUR: "de-DE" };
  const currencyMap = { TL: "TRY", USD: "USD", EUR: "EUR" };
  return new Intl.NumberFormat(localeMap[currency], {
    style: "currency",
    currency: currencyMap[currency],
  }).format(amount);
}

export function formatDate(date: string | Date, locale: string = "tr-TR"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

/**
 * Normalize Turkish characters to English equivalents and convert to uppercase.
 * ç→C, ğ→G, ı→I, ö→O, ş→S, ü→U, İ→I etc.
 */
const TR_MAP: Record<string, string> = {
  ç: "C", Ç: "C", ğ: "G", Ğ: "G", ı: "I", İ: "I",
  ö: "O", Ö: "O", ş: "S", Ş: "S", ü: "U", Ü: "U",
};

export function normalizeText(value: string): string {
  return value
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TR_MAP[ch] ?? ch)
    .toUpperCase();
}

/**
 * Recursively normalize all string values in an object (for custom_fields JSONB).
 * Skips keys starting with _ (like _valid, _smart internal flags) but processes their children.
 */
export function normalizeObject<T>(obj: T): T {
  if (typeof obj === "string") return normalizeText(obj) as T;
  if (Array.isArray(obj)) return obj.map(normalizeObject) as T;
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (key === "_valid") {
        result[key] = val;
      } else {
        result[key] = normalizeObject(val);
      }
    }
    return result as T;
  }
  return obj;
}

export function formatDateTime(date: string | Date, locale: string = "tr-TR"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
