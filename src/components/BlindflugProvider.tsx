"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { translations } from "@/lib/i18n/dictionary";

// Blindflug: the run is played without the app's own analysis. Set per
// run-scoped page from `settings.blindflug`, read by the components that have
// something to hide - which keeps the flag out of a dozen prop chains.
//
// The default is `false`, so a component rendered outside a provider (a static
// page, a test) shows everything rather than silently going blank.
const BlindflugContext = createContext(false);
// The "hide Pokémon types too" child rule, already combined with blindflug by
// the page (on only while blindflug is). Read by TypeBadge, so every chip on
// a Pokémon goes without a prop anywhere.
const HideTypesContext = createContext(false);

export function BlindflugProvider({
  on,
  hideTypes = false,
  children,
}: {
  on: boolean;
  hideTypes?: boolean;
  children: ReactNode;
}) {
  return (
    <BlindflugContext.Provider value={on}>
      <HideTypesContext.Provider value={on && hideTypes}>{children}</HideTypesContext.Provider>
    </BlindflugContext.Provider>
  );
}

export function useBlindflug(): boolean {
  return useContext(BlindflugContext);
}

export function useHideTypes(): boolean {
  return useContext(HideTypesContext);
}

// Stands in where a WHOLE block disappears (the opponent's move types, the
// Pokédex move list, the Overview's coverage section). Always rendered UNDER
// that block's own heading, never instead of it - the heading is what names
// the thing being withheld.
//
// A struck-out block rather than a line of grey text: the gap is the point, so
// it gets area. The caller keeps its heading, this fills the space the content
// used to occupy, and the hatch matches the tape at the top of the page so the
// two read as the same signal.
//
// Inline chips are still dropped silently - a redaction block per chip would
// be far louder than the chip it replaced.
export function BlindflugNotice({ className = "" }: { className?: string }) {
  const { lang } = useLanguage();
  const t = translations[lang].blindflug;
  return (
    <div
      className={`blindflug-redacted flex min-h-16 items-center justify-center rounded-md px-3 py-4 ${className}`}
    >
      {/* The label sits on the panel colour so it punches a hole through the
          hatch instead of fighting it. */}
      <span className="rounded-sm bg-panel px-2 py-1 text-xs font-bold uppercase tracking-widest text-blindflug">
        {t.hidden}
      </span>
    </div>
  );
}
