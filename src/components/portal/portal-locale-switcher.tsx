"use client";

import { usePortalLocale } from "./portal-locale-provider";

const LOCALES = [
  { code: "tr", label: "TR" },
  { code: "en", label: "EN" },
] as const;

export function PortalLocaleSwitcher() {
  const { locale, setLocale } = usePortalLocale();

  return (
    <div className="flex items-center gap-1">
      {LOCALES.map((l, i) => {
        const isActive = locale === l.code;
        return (
          <span key={l.code} className="flex items-center">
            {i > 0 && (
              <span className="mx-1.5 text-slate-300 dark:text-slate-600 text-sm select-none">/</span>
            )}
            <button
              onClick={() => setLocale(l.code)}
              className={`text-sm font-semibold transition-colors duration-150 ${
                isActive
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              }`}
            >
              {l.label}
            </button>
          </span>
        );
      })}
    </div>
  );
}
