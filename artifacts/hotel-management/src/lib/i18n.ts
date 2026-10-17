"use client";
import { useState, useEffect, useCallback, createContext, useContext } from "react";

export type Locale = "en" | "am" | "om" | "ar" | "fr";

export const LOCALES: { code: Locale; label: string; nativeLabel: string; rtl?: boolean }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "am", label: "Amharic", nativeLabel: "አማርኛ" },
  { code: "om", label: "Oromo", nativeLabel: "Afaan Oromoo" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", rtl: true },
  { code: "fr", label: "French", nativeLabel: "Français" },
];

// Cache of loaded locale data
const localeCache: Record<string, any> = {};

async function loadLocale(locale: Locale, namespace: string): Promise<Record<string, any>> {
  const key = `${locale}/${namespace}`;
  if (localeCache[key]) return localeCache[key];
  try {
    const data = await import(`../locales/${locale}/${namespace}.json`);
    localeCache[key] = data.default ?? data;
  } catch {
    // Fallback to English
    const data = await import(`../locales/en/${namespace}.json`);
    localeCache[key] = data.default ?? data;
  }
  return localeCache[key];
}

function getNestedValue(obj: any, path: string): string {
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current == null) return path;
    current = current[key];
  }
  return typeof current === "string" ? current : path;
}

export function useTranslation(namespace = "common") {
  const { locale } = useLocaleContext();
  const [translations, setTranslations] = useState<Record<string, any>>({});

  useEffect(() => {
    loadLocale(locale, namespace).then(setTranslations);
  }, [locale, namespace]);

  const t = useCallback((key: string, fallback?: string): string => {
    const value = getNestedValue(translations, key);
    return value !== key ? value : (fallback ?? key);
  }, [translations]);

  return { t, locale };
}

// ─── Locale Context ──────────────────────────────────────────────────────────
interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  isRtl: boolean;
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  isRtl: false,
});

export function useLocaleContext() {
  return useContext(LocaleContext);
}

export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  return (localStorage.getItem("hms_locale") as Locale) ?? "en";
}
