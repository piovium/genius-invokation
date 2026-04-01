import {
  ParentProps,
  createMemo,
  createContext,
  createEffect,
  createSignal,
  useContext,
} from "solid-js";
import { AssetsManager } from "@gi-tcg/assets-manager";
import { I18nKey } from "./locales";
import { makePersisted } from "@solid-primitives/storage";
import zhCN from "./locales/zh-CN";
import en from "./locales/en";
import { resolveTemplate, translator } from "@solid-primitives/i18n";

export type Locale = "zh-CN" | "en";

const translations = {
  "zh-CN": zhCN,
  en: en,
};

interface I18nContextValue {
  locale: () => Locale;
  setLocale: (locale: Locale) => void;
  assetsManager: () => AssetsManager;
  t: (key: I18nKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>();

export function I18nProvider(props: ParentProps) {
  const [locale, setLocale] = makePersisted(createSignal<Locale>("zh-CN"), {
    name: "locale",
  });

  const assetsManager = createMemo(() => {
    const manager = new AssetsManager({
      language: locale() === "zh-CN" ? "CHS" : "EN",
    });
    void manager.prepareForSync().catch(() => void 0);
    return manager;
  });

  const dict = createMemo(() => translations[locale()]);
  const t = translator(dict, resolveTemplate);

  const value: I18nContextValue = {
    locale,
    setLocale,
    assetsManager,
    t,
  };

  return (
    <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext)!;
}
