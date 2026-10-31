"use client";

import { LANGS, REVIEWED_LANGS, translations, type Lang } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/components/ui/cn";

// Each language in its own words, so it is findable whatever the page is in.
const NATIVE_NAMES: Record<Lang, string> = {
  de: "Deutsch",
  en: "English",
  fr: "Français",
  es: "Español",
  it: "Italiano",
};

// The language buttons with the machine-translation note under them. The gear
// menu shows compact codes; the start page's welcome shows the names, so a
// fresh install can switch language before anything else.
export function LanguagePicker({
  variant = "codes",
  onPick,
  className,
}: {
  variant?: "codes" | "names";
  onPick?: (lang: Lang) => void;
  className?: string;
}) {
  const { lang, setLang } = useLanguage();
  const t = translations[lang];
  const names = variant === "names";
  return (
    <div className={className}>
      <span className={cn("mb-1.5 block text-xs font-medium text-ink-subtle", names && "text-center")}>
        {t.menu.language}
      </span>
      <div className={cn("flex gap-1", names && "flex-wrap justify-center gap-2")}>
        {LANGS.map((code) => (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={code === lang}
            onClick={() => {
              setLang(code);
              onPick?.(code);
            }}
            className={cn(
              "h-10 rounded-md border text-xs font-semibold transition-colors",
              names ? "px-3 text-sm" : "flex-1 uppercase",
              code === lang
                ? "border-accent bg-accent text-accent-ink"
                : "border-line text-ink-muted hover:bg-hover hover:text-ink",
            )}
          >
            {names ? NATIVE_NAMES[code] : code}
          </button>
        ))}
      </div>
      {!REVIEWED_LANGS.includes(lang) && (
        <p className={cn("mt-1.5 text-xs text-ink-muted", names && "text-center")}>{t.dataNotice.machineTranslated}</p>
      )}
    </div>
  );
}
