"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { NextIntlClientProvider, useLocale } from "next-intl";
import enMessages from "../../../messages/en.json";
import trMessages from "../../../messages/tr.json";

const messages: Record<string, typeof enMessages> = {
  en: enMessages,
  tr: trMessages,
};

interface AdminLocaleContextValue {
  locale: string;
  setLocale: (locale: string) => void;
}

const AdminLocaleContext = createContext<AdminLocaleContextValue>({
  locale: "tr",
  setLocale: () => {},
});

export function useAdminLocale() {
  return useContext(AdminLocaleContext);
}

export function AdminLocaleProvider({ children }: { children: ReactNode }) {
  const urlLocale = useLocale();
  const [locale, setLocaleState] = useState(urlLocale);

  const setLocale = useCallback((code: string) => {
    if (code === "tr" || code === "en") {
      setLocaleState(code);
    }
  }, []);

  return (
    <AdminLocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        {children}
      </NextIntlClientProvider>
    </AdminLocaleContext.Provider>
  );
}
