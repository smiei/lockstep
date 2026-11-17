"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { pickActiveRun } from "@/lib/runKey";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { translations } from "@/lib/i18n/dictionary";
import type { RunSummary } from "@/lib/types";

function GearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.56V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1-1.56 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.56-1H3a2 2 0 110-4h.09a1.7 1.7 0 001.56-1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34h.01a1.7 1.7 0 001-1.56V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.56h.01a1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87v.01a1.7 1.7 0 001.56 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.56 1z"
      />
    </svg>
  );
}

// The header's gear: a link to the Settings page, which took over what used
// to be a dropdown menu here. The language had a quick switch of its own
// beside it until 6.0; it is set once, so it lives in Settings like the rest
// (src/components/SettingsView.tsx) and the rail's buttons fit on one row.
export function HeaderMenu({ runs }: { runs: RunSummary[] }) {
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const t = translations[lang];

  const activeRun = pickActiveRun(runs, searchParams.get("run"));

  return (
    <Link
      href={activeRun ? `/settings?run=${activeRun.accessKey}` : "/settings"}
      aria-label={t.settings.title}
      title={t.settings.title}
      className="flex h-10 w-10 items-center justify-center rounded-md border border-line text-ink-muted transition-colors hover:bg-hover hover:text-ink"
    >
      <GearIcon className="h-5 w-5" />
    </Link>
  );
}
