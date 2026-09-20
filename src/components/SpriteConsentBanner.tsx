"use client";

import { IS_PUBLIC_INSTANCE } from "@/lib/instance";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { translations } from "@/lib/i18n/dictionary";
import { Button } from "@/components/ui/Button";
import { useSpriteConsent } from "@/components/SpriteConsentProvider";

// The one question a public instance asks: may the browser load Pokémon
// artwork from third-party servers (see src/lib/spriteConsent.ts). Shown until
// it is answered; SpriteConsentSetting in the footer changes the answer later.
export function SpriteConsentBanner() {
  const { lang } = useLanguage();
  const { consent, ready, set } = useSpriteConsent();
  if (!IS_PUBLIC_INSTANCE || !ready || consent !== null) return null;
  const t = translations[lang].spriteConsent;

  return (
    <div role="region" aria-label={t.title} className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-line-strong bg-panel p-4 shadow-lg">
        <p className="min-w-0 flex-1 basis-64 text-sm text-ink-muted">{t.text}</p>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" onClick={() => set("denied")}>
            {t.deny}
          </Button>
          <Button size="sm" variant="primary" onClick={() => set("granted")}>
            {t.allow}
          </Button>
        </div>
      </div>
    </div>
  );
}
