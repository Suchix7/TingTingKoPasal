"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axiosInstance from "@/lib/axiosInstance";
import { zh } from "./zh";

export type Lang = "en" | "zh";

const STORAGE_KEY = "admin-lang";

// For code outside React (toasts in hooks): translate with the current language
let activeLang: Lang = "en";
export const tr = (text: string) =>
  activeLang === "zh" ? (zh[text] ?? text) : text;

type I18n = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  // English text in, text in the current language out
  t: (text: string) => string;
  // product / category name -> its Chinese name (when one is set)
  tn: (name: string) => string;
  refreshNames: () => void;
};

const I18nContext = createContext<I18n>({
  lang: "en",
  setLang: () => {},
  t: (text) => text,
  tn: (name) => name,
  refreshNames: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // start in English on server and client alike, then apply the saved choice
  const [lang, setLangState] = useState<Lang>("en");
  const [names, setNames] = useState<Record<string, string>>({});

  const refreshNames = useCallback(() => {
    axiosInstance
      .get("/products/name-map")
      .then((res) => setNames(res.data?.data ?? {}))
      .catch(() => {});
  }, []);

  // Chinese product / category names are fetched once Chinese is chosen
  useEffect(() => {
    if (lang === "zh") refreshNames();
  }, [lang, refreshNames]);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "zh") setLangState("zh");
    } catch {}
  }, []);

  useEffect(() => {
    activeLang = lang;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang,
      t: (text) => (lang === "zh" ? (zh[text] ?? text) : text),
      tn: (name) => (lang === "zh" ? (names[name] ?? zh[name] ?? name) : name),
      refreshNames,
    }),
    [lang, setLang, names, refreshNames],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useLang = () => useContext(I18nContext);
