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

interface PortalLocaleContextValue {
  locale: string;
  setLocale: (locale: string) => void;
}

const PortalLocaleContext = createContext<PortalLocaleContextValue>({
  locale: "tr",
  setLocale: () => {},
});

export function usePortalLocale() {
  return useContext(PortalLocaleContext);
}

export function PortalLocaleProvider({ children }: { children: ReactNode }) {
  const urlLocale = useLocale();
  const [locale, setLocaleState] = useState(urlLocale);

  const setLocale = useCallback((code: string) => {
    if (code === "tr" || code === "en") {
      setLocaleState(code);
    }
  }, []);

  return (
    <PortalLocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        {children}
      </NextIntlClientProvider>
    </PortalLocaleContext.Provider>
  );
}
