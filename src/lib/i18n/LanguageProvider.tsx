"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, isLang, type Lang } from "@/lib/i18n/dictionary";
import { clientRuntimeConfig, pickLang } from "@/lib/runtimeConfig";

type LanguageContextValue = { lang: Lang; setLang: (lang: Lang) => void };

const LanguageContext = createContext<LanguageContextValue | null>(null);

// What the server renders: the provider starts on "de" (see below).
const SERVER_LANG: Lang = "de";

function readCookieLang(): Lang | null {
  if (typeof document === "undefined") return null;
  const value = document.cookie.match(/(?:^|; )lang=([^;]+)/)?.[1];
  return isLang(value) ? value : null;
}

function writeLangCookie(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

// Running as the installed app (home-screen PWA) rather than in a browser tab.
function isInstalledApp(): boolean {
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

function deviceLang(): Lang | null {
  try {
    return pickLang(navigator.languages?.length ? navigator.languages : [navigator.language]);
  } catch {
    return null;
  }
}

// No choice stored on this device. A browser tab follows the server's
// DEFAULT_LANGUAGE, then the device (the same order getLang uses on the
// server, so both halves of a page agree); the installed app follows the
// device first. A device in none of the five languages gets English.
function fallbackLang(): Lang {
  const configured = clientRuntimeConfig().lang;
  if (isInstalledApp()) return deviceLang() ?? configured ?? "en";
  return configured ?? deviceLang() ?? "en";
}

// The language this device uses: a choice made in this page's lifetime, else
// the cookie, else the fallback order above. A tiny store rather than state,
// so the provider reads it with useSyncExternalStore instead of copying it in
// an effect.
let chosenLang: Lang | null = null;
const langListeners = new Set<() => void>();

function subscribeLang(listener: () => void): () => void {
  langListeners.add(listener);
  return () => {
    langListeners.delete(listener);
  };
}

function clientLang(): Lang {
  return chosenLang ?? readCookieLang() ?? fallbackLang();
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // Server and hydration always agree on "de" (getServerSnapshot) to avoid a
  // text hydration mismatch; the real stored preference follows right after -
  // the same "briefly shows the default, then corrects" trade-off ThemeToggle
  // makes for its icon.
  const lang = useSyncExternalStore(subscribeLang, clientLang, () => SERVER_LANG);

  useEffect(() => {
    if (!readCookieLang() && isInstalledApp()) {
      // The server cannot tell the app from a browser tab and rendered the
      // browser's default; store the device language so it renders that from
      // now on. Written once - from then on it behaves like a chosen language.
      writeLangCookie(fallbackLang());
      router.refresh();
    }
  }, [router]);

  // The layout's <html lang> is static; screen readers need the real one.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function setLang(next: Lang) {
    chosenLang = next;
    writeLangCookie(next);
    langListeners.forEach((listener) => listener());
    // Dynamic pages (tracker/links/levelcaps) resolve their language
    // server-side from the same cookie - refresh so they re-render with it.
    router.refresh();
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>
  );
}

const noSubscribe = () => () => {};

// While a component hydrates it gets the server's language, afterwards the
// real one. That matters for a Suspense boundary that hydrates only after the
// provider switched (the gear menu and Blindflug button, which read ?run=):
// hydrating it straight in the new language left the server's German
// aria-label/title in the DOM, because React does not patch attributes that
// differ during hydration. getServerSnapshot is what hydration reads, so the
// boundary first matches the server HTML and then re-renders in the real
// language.
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return hydrated ? ctx : { ...ctx, lang: SERVER_LANG };
}
