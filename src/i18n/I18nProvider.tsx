import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import en from "./en.json";
import tr from "./tr.json";

export type LanguageCode = "tr" | "en";

type Dictionary = Record<string, unknown>;

const STORAGE_KEY = "evnetwork.lang";

function readInitialLanguage(): LanguageCode {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "tr" || raw === "en") return raw;
  } catch {
    // ignore
  }

  const browser = (navigator.language || "").toLowerCase();
  if (browser.startsWith("tr")) return "tr";
  return "en";
}

function setHtmlLang(lang: LanguageCode) {
  try {
    document.documentElement.lang = lang;
  } catch {
    // ignore
  }
}

function persistLanguage(lang: LanguageCode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

function getByPath(dict: Dictionary, key: string): string | null {
  const parts = key.split(".");
  let current: unknown = dict;
  for (const part of parts) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : null;
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

type I18nContextValue = {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  toggleLang: () => void;
  t: TFunction;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(() => readInitialLanguage());

  const dict = useMemo(() => (lang === "tr" ? (tr as Dictionary) : (en as Dictionary)), [lang]);
  const fallbackDict = useMemo(() => (lang === "tr" ? (en as Dictionary) : (tr as Dictionary)), [lang]);

  const setLang = useCallback((next: LanguageCode) => {
    setLangState(next);
    persistLanguage(next);
    setHtmlLang(next);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "tr" ? "en" : "tr");
  }, [lang, setLang]);

  const t = useCallback<TFunction>(
    (key, vars) => {
      const value = getByPath(dict, key) ?? getByPath(fallbackDict, key) ?? key;
      return interpolate(value, vars);
    },
    [dict, fallbackDict],
  );

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, toggleLang, t }), [lang, setLang, t, toggleLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

