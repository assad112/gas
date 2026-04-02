"use client";

import {
  createContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";

import { translations } from "@/data/translations";

export const I18nContext = createContext(null);
const supportedLocales = new Set(["ar", "en"]);

function getNestedValue(object, path) {
  return path.split(".").reduce((result, segment) => result?.[segment], object);
}

function interpolate(template, values = {}) {
  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replaceAll(`{${key}}`, value);
  }, template);
}

function resolveLocale(locale) {
  return supportedLocales.has(locale) ? locale : "ar";
}

function applyLocaleAttributes(locale) {
  if (typeof document === "undefined") {
    return;
  }

  const direction = locale === "ar" ? "rtl" : "ltr";

  document.documentElement.lang = locale;
  document.documentElement.dir = direction;
  document.documentElement.dataset.locale = locale;

  if (document.body) {
    document.body.dir = direction;
  }

  window.localStorage.setItem("gas-admin-locale", locale);
  document.cookie = `gas-admin-locale=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function I18nProvider({ children, initialLocale = "ar" }) {
  const [locale, setLocale] = useState(resolveLocale(initialLocale));
  const switchTimeoutRef = useRef(null);

  useEffect(() => {
    const savedLocale = window.localStorage.getItem("gas-admin-locale");

    if (supportedLocales.has(savedLocale) && savedLocale !== locale) {
      setLocale(savedLocale);
    }
  }, []);

  useLayoutEffect(() => {
    applyLocaleAttributes(locale);
  }, [locale]);

  useEffect(() => {
    return () => {
      if (switchTimeoutRef.current) {
        window.clearTimeout(switchTimeoutRef.current);
      }
    };
  }, []);

  const direction = locale === "ar" ? "rtl" : "ltr";

  function switchLocale(nextLocale) {
    const resolvedLocale = resolveLocale(nextLocale);

    if (resolvedLocale === locale) {
      return;
    }

    document.documentElement.dataset.localeSwitching = "true";
    setLocale(resolvedLocale);

    if (switchTimeoutRef.current) {
      window.clearTimeout(switchTimeoutRef.current);
    }

    switchTimeoutRef.current = window.setTimeout(() => {
      delete document.documentElement.dataset.localeSwitching;
      switchTimeoutRef.current = null;
    }, 220);
  }

  function t(path, values) {
    const translation =
      getNestedValue(translations[locale], path) ||
      getNestedValue(translations.ar, path) ||
      path;

    if (typeof translation !== "string") {
      return translation;
    }

    return interpolate(translation, values);
  }

  const value = {
    locale,
    direction,
    isRTL: direction === "rtl",
    setLocale: switchLocale,
    toggleLocale: () => switchLocale(locale === "ar" ? "en" : "ar"),
    t
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
