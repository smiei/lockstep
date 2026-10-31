"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, isLang, type Lang } from "@/lib/i18n/dictionary";
import { clientRuntimeConfig, pickLang } from "@/lib/runtimeConfig";

type LanguageContextValue = { lang: Lang; setLang: (lang: Lang) => void };

const LanguageContext = createContext<LanguageContextValue | null>(null);

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
// device first.
function fallbackLang(): Lang {
  const configured = clientRuntimeConfig().lang;
  if (isInstalledApp()) return deviceLang() ?? configured ?? "de";
  return configured ?? deviceLang() ?? "de";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // Server and the first client render always agree on "de" (no cookie read
  // here) to avoid a text hydration mismatch; the real stored preference is
  // applied right after mount - the same "briefly shows the default, then
  // corrects" trade-off ThemeToggle already makes for its icon.
  const [lang, setLangState] = useState<Lang>("de");

  useEffect(() => {
    const stored = readCookieLang();
    const next = stored ?? fallbackLang();
    if (!stored && isInstalledApp()) {
      // The server cannot tell the app from a browser tab and rendered the
      // browser's default; store the device language so it renders that from
      // now on. Written once - from then on it behaves like a chosen language.
      writeLangCookie(next);
      router.refresh();
    }
    setLangState(next);
  }, [router]);

  function setLang(next: Lang) {
    setLangState(next);
    writeLangCookie(next);
    // Dynamic pages (tracker/links/levelcaps) resolve their language
    // server-side from the same cookie - refresh so they re-render with it.
    router.refresh();
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
