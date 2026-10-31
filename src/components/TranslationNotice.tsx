"use client";

import { useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { REVIEWED_LANGS, translations } from "@/lib/i18n/dictionary";
import { useToast } from "@/components/ui/ToastProvider";

// Remembers per device which machine-translated languages were already
// announced, so the notice comes once per language, not on every visit.
const SEEN_KEY = "nuzlocke:translationNoticeSeen";

function seen(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

// The first time a device shows a machine-translated language (anything but
// REVIEWED_LANGS), one toast says so - and that the Pokémon names are
// official, since those come from PokeAPI in every language. The gear menu
// repeats the short version under the language buttons for good.
export function TranslationNotice() {
  const { lang } = useLanguage();
  const toast = useToast();

  useEffect(() => {
    if (REVIEWED_LANGS.includes(lang)) return;
    const already = seen();
    if (already.includes(lang)) return;
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...already, lang]));
    } catch {
      // Storage blocked: the notice may come again, which is harmless.
    }
    toast.info(translations[lang].dataNotice.machineTranslatedLong);
  }, [lang, toast]);

  return null;
}
