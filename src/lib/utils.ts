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

export function formatDateTime(date: string | Date, locale: string = "tr-TR"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
