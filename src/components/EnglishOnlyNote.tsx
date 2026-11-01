import { Badge } from "@/components/ui/Badge";
import { translations, type Lang } from "@/lib/i18n/dictionary";

// ROM hacks exist in English only, so their packs name places, bosses and
// badges in English in every language (scripts/import-nuzlocke-app.mjs) -
// what the player reads in the game. Said once where the game is picked and
// at the top of the Encounter tab; not in English, where it goes without saying.
export function EnglishOnlyNote({ lang, className = "" }: { lang: Lang; className?: string }) {
  if (lang === "en") return null;
  const t = translations[lang].dataNotice;
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-ink-muted ${className}`}>
      <Badge tone="info">{t.englishOnlyBadge}</Badge>
      <span>{t.englishOnlyHint}</span>
    </p>
  );
}
