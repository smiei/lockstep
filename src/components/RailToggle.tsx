"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { translations } from "@/lib/i18n/dictionary";
import { setRailCollapsed } from "@/lib/railCollapsed";

function ChevronIcon({ direction, className }: { direction: "left" | "right"; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

// Folding the side rail away on a desktop. The state is the `data-rail`
// attribute on <html> (set before first paint by railBootScript) and CSS does
// the hiding, so neither button needs React state: no flash on load and no
// set-state-in-effect.

// At the foot of the rail, beside the gear, theme and Blindflug buttons.
export function RailCollapseButton() {
  const { lang } = useLanguage();
  const t = translations[lang].header;
  return (
    <button
      type="button"
      onClick={() => setRailCollapsed(true)}
      aria-label={t.railHide}
      title={t.railHide}
      className="ml-auto hidden h-10 w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-hover hover:text-ink lg:flex"
    >
      <ChevronIcon direction="left" className="h-5 w-5" />
    </button>
  );
}

// A small green tab on the left edge while the rail is folded away; shown by
// CSS (.rail-expand) only then.
export function RailExpandButton() {
  const { lang } = useLanguage();
  const t = translations[lang].header;
  return (
    <button
      type="button"
      onClick={() => setRailCollapsed(false)}
      aria-label={t.railShow}
      title={t.railShow}
      className="shell rail-expand fixed bottom-6 left-0 z-30 h-12 w-7 items-center justify-center rounded-r-md bg-shell text-ink-muted shadow-lg transition-colors hover:text-ink"
    >
      <ChevronIcon direction="right" className="h-5 w-5" />
    </button>
  );
}
