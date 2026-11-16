"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDropdown } from "@/lib/useDropdown";
import { pickActiveRun } from "@/lib/runKey";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LANGS, translations } from "@/lib/i18n/dictionary";
import { NATIVE_NAMES } from "@/components/LanguagePicker";
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

const squareClass =
  "flex h-10 w-10 items-center justify-center rounded-md border border-line text-ink-muted transition-colors hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-50";

// The header's utility buttons next to the theme switch: the gear (a link to
// the Settings page, which took over what used to be a dropdown menu here)
// and the language. Everything else lives on
// /settings (src/components/SettingsView.tsx).
export function HeaderMenu({ runs }: { runs: RunSummary[] }) {
  const searchParams = useSearchParams();
  const { lang, setLang } = useLanguage();
  const { open, setOpen, toggle, containerRef, triggerProps } = useDropdown();
  const t = translations[lang];

  const activeRun = pickActiveRun(runs, searchParams.get("run"));

  return (
    <>
      <Link
        href={activeRun ? `/settings?run=${activeRun.accessKey}` : "/settings"}
        aria-label={t.settings.title}
        title={t.settings.title}
        className={squareClass}
      >
        <GearIcon className="h-5 w-5" />
      </Link>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={toggle}
          {...triggerProps}
          aria-label={`${t.menu.language}: ${NATIVE_NAMES[lang]}`}
          title={t.menu.language}
          className={`${squareClass} text-xs font-semibold uppercase`}
        >
          {lang}
        </button>
        {open && (
          // z-50: the phone's tab strip below the header is sticky at z-40
          // and this list opens straight down across it. From lg the button
          // sits at the foot of the side rail, so the list opens upwards.
          // `unshell`: a page surface, not part of the green field.
          <ul className="unshell absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-lg border border-line-strong bg-panel py-1 shadow-lg lg:bottom-full lg:left-0 lg:right-auto lg:mb-1 lg:mt-0">
            {LANGS.map((code) => (
              <li key={code}>
                <button
                  type="button"
                  lang={code}
                  aria-current={code === lang ? "true" : undefined}
                  onClick={() => {
                    setLang(code);
                    setOpen(false);
                  }}
                  className={`flex min-h-10 w-full items-center px-3 py-2 text-left text-sm text-ink hover:bg-hover ${
                    code === lang ? "bg-sunken font-semibold" : ""
                  }`}
                >
                  {NATIVE_NAMES[code]}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
