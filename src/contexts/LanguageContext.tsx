"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getT, type Locale, type Translations } from "@/lib/i18n";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "en",
  setLocale: () => {},
  t: getT("en"),
});

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const ls = localStorage.getItem("locale");
    if (ls === "en" || ls === "ro") return ls;
    const cookie = document.cookie.split(";").find((c) => c.trim().startsWith("locale="));
    const val = cookie?.split("=")?.[1]?.trim();
    if (val === "en" || val === "ro") return val;
  } catch { /* noop */ }
  return "en";
}

function writeLocale(l: Locale) {
  try {
    localStorage.setItem("locale", l);
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `locale=${l}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch { /* noop */ }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    writeLocale(l);
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: getT(locale) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}