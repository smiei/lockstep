import { Badge } from "@/components/ui/Badge";
import { translations, type Lang } from "@/lib/i18n/dictionary";
import { REPORT_ISSUE_URL } from "@/lib/links";

// "Data unverified" for a game pack whose route list, order and place names
// the maintainer has not checked yet (game.json dataStatus). Pokémon names
// are not part of it - they come from PokeAPI. Shown under the New-Run
// dialog's game picker and at the top of the Encounter tab.
export function UnverifiedDataNote({ lang, className = "" }: { lang: Lang; className?: string }) {
  const t = translations[lang].dataNotice;
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-ink-muted ${className}`}>
      <Badge tone="warning">{t.unverifiedBadge}</Badge>
      <span>
        {t.unverifiedHint}{" "}
        <a
          href={REPORT_ISSUE_URL}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-ink underline underline-offset-2"
        >
          {t.report}
        </a>
      </span>
    </p>
  );
}
