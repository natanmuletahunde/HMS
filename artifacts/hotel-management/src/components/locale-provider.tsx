"use client";
import { useState, useEffect } from "react";
import { LocaleContext, type Locale, getStoredLocale, LOCALES } from "@/lib/i18n";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = getStoredLocale();
    setLocaleState(stored);
    const isRtl = LOCALES.find(l => l.code === stored)?.rtl ?? false;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = stored;
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("hms_locale", l);
    const isRtl = LOCALES.find(loc => loc.code === l)?.rtl ?? false;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = l;
  };

  const isRtl = LOCALES.find(l => l.code === locale)?.rtl ?? false;

  return (
    <LocaleContext.Provider value={{ locale, setLocale, isRtl }}>
      {children}
    </LocaleContext.Provider>
  );
}
