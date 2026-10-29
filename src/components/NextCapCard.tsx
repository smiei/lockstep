"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { pickActiveRun } from "@/lib/runKey";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { translations } from "@/lib/i18n/dictionary";
import { localizeName } from "@/lib/i18n/localize";
import type { RunCapSummary, RunSummary } from "@/lib/types";

// The run's next level cap, pinned to the side rail so it is on screen from
// every tab - it is the number a player checks before every gym. A link to the
// Reise tab, where the caps are ticked off. Resolves the run from ?run= like
// the run switcher, so it needs a Suspense boundary above it.
//
// `chip` is the phone's version in the green top bar: just the number, the
// leader in the accessible name - half the use is on a phone next to the
// console, and the cap is what gets checked there before every gym.
export function NextCapCard({
  runs,
  caps,
  variant = "card",
}: {
  runs: RunSummary[];
  caps: RunCapSummary[];
  variant?: "card" | "chip";
}) {
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const t = translations[lang].header;
  const run = pickActiveRun(runs, searchParams.get("run"));
  const summary = run ? caps.find((cap) => cap.accessKey === run.accessKey) : undefined;
  if (!run || !summary) return null;

  if (variant === "chip") {
    if (!summary.next) return null;
    const label = `${t.nextCap}: ${localizeName(summary.next.names, lang)}, ${summary.next.level}`;
    return (
      <Link
        href={`/levelcaps?run=${run.accessKey}`}
        aria-label={label}
        title={label}
        className="flex h-10 items-center gap-1.5 rounded-md border border-line px-2.5 text-ink transition-colors hover:bg-hover"
      >
        <span className="text-xs text-ink-muted">{t.capShort}</span>
        <span className="font-mono text-lg font-semibold leading-none tabular-nums">
          {summary.next.level}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/levelcaps?run=${run.accessKey}`}
      className="block rounded-md bg-hover px-3 py-2.5 transition-colors hover:bg-panel"
    >
      <span className="block text-xs text-ink-muted">{t.nextCap}</span>
      {summary.next ? (
        <>
          <span className="mt-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-base font-bold text-ink">
              {localizeName(summary.next.names, lang)}
            </span>
            <span className="font-mono text-3xl font-semibold leading-none tabular-nums text-ink">
              {summary.next.level}
            </span>
          </span>
          <span className="block truncate text-xs text-ink-muted">
            {localizeName(summary.next.location, lang)}
          </span>
        </>
      ) : (
        <span className="mt-1 block text-sm font-bold text-ink">{t.allCapsDone}</span>
      )}
      {summary.badgesTotal > 0 && (
        <span className="mt-2 block border-t border-line pt-1.5 font-mono text-xs tabular-nums text-ink-muted">
          {t.badges(summary.badges, summary.badgesTotal)}
        </span>
      )}
    </Link>
  );
}
