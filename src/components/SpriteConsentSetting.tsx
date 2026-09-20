"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { translations } from "@/lib/i18n/dictionary";
import { useSpriteConsent } from "@/components/SpriteConsentProvider";

// The footer's way back to the question, so agreeing is never a one-way door.
export function SpriteConsentSetting() {
  const { lang } = useLanguage();
  const { consent, ready, set } = useSpriteConsent();
  if (!ready) return null;
  const t = translations[lang].spriteConsent;
  const on = consent === "granted";

  return (
    <button type="button" onClick={() => set(on ? "denied" : "granted")} className="underline hover:text-ink">
      {on ? t.settingOn : t.settingOff}
    </button>
  );
}
