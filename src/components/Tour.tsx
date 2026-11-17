"use client";

import { useMounted } from "@/lib/useMounted";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { translations } from "@/lib/i18n/dictionary";
import { pickActiveRun } from "@/lib/runKey";
import { TOURS, TOUR_SEEN_KEY, endTour, getTourState, moveTour, startTour, subscribeTour, type TourKind } from "@/lib/tourStore";
import { usePersistentState } from "@/lib/usePersistentState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const GAP = 12;
const PAD = 6;

// The first match that is actually on screen: the shell renders some controls
// once per layout and hides one of them.
function firstVisible(selector: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return null;
}

// The guided tour (optional, offered once per device) and its second round
// for Infinite Fusion runs. Each step shows a tab and points at a real
// control: a dimmed page with the control cut out, and a card beside it.
// Mounted once in the root layout; state lives in src/lib/tourStore.ts.
export function Tour({ runs, fusionGameIds }: { runs: { id: number; accessKey: string; gameId: string }[]; fusionGameIds: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const t = translations[lang].tour;
  const tNav = translations[lang].nav;
  const titleId = useId();
  const state = useSyncExternalStore(subscribeTour, getTourState, () => null);
  const [seen, setSeen] = usePersistentState<TourKind[]>(TOUR_SEEN_KEY, []);
  // What this device has seen is only known in the browser; until then no
  // offer, or it would flash on every page load.
  const mounted = useMounted();
  const holeRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const activeRun = pickActiveRun(runs, searchParams.get("run"));
  const runKey = activeRun?.accessKey;
  const steps = state ? TOURS[state.kind] : [];
  const step = state ? steps[state.step] : undefined;
  const stepHref = step?.href;
  const selector = step?.selector;
  const block = step?.block;

  // A tab step opens its tab.
  useEffect(() => {
    if (stepHref && runKey && pathname !== stepHref) router.push(`${stepHref}?run=${runKey}`);
  }, [stepHref, runKey, pathname, router]);

  // Cut the control out of the dimmed page and put the card beside it. Done
  // on the elements directly: a measured rectangle in React state would be a
  // setState in an effect, and it changes on every scroll and resize anyway.
  useEffect(() => {
    if (!step) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tries = 0;

    function place(scroll: boolean) {
      const hole = holeRef.current;
      const card = cardRef.current;
      if (!hole || !card) return;
      const target = selector ? firstVisible(selector) : null;
      // After a navigation the control is not there yet - look again for a
      // moment before settling for the middle of the page.
      if (selector && !target && tries++ < 30) {
        timer = setTimeout(() => place(scroll), 100);
        return;
      }
      if (target && scroll) target.scrollIntoView({ block: block ?? "nearest", inline: "center" });
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cw = card.offsetWidth;
      const ch = card.offsetHeight;
      const clampX = (x: number) => Math.max(GAP, Math.min(x, vw - cw - GAP));
      const clampY = (y: number) => Math.max(GAP, Math.min(y, vh - ch - GAP));
      if (!target) {
        Object.assign(hole.style, { left: `${vw / 2}px`, top: `${vh / 2}px`, width: "0px", height: "0px" });
        Object.assign(card.style, { left: `${clampX((vw - cw) / 2)}px`, top: `${clampY((vh - ch) / 2)}px` });
        return;
      }
      const r = target.getBoundingClientRect();
      Object.assign(hole.style, {
        left: `${r.left - PAD}px`,
        top: `${r.top - PAD}px`,
        width: `${r.width + 2 * PAD}px`,
        height: `${r.height + 2 * PAD}px`,
      });
      // Beside the control when there is room (the desktop rail), else under
      // it, else above it.
      if (r.right + PAD + GAP + cw + GAP <= vw && r.width < vw / 2) {
        Object.assign(card.style, { left: `${r.right + PAD + GAP}px`, top: `${clampY(r.top - PAD)}px` });
      } else if (r.bottom + PAD + GAP + ch + GAP <= vh) {
        Object.assign(card.style, { left: `${clampX(r.left - PAD)}px`, top: `${r.bottom + PAD + GAP}px` });
      } else {
        Object.assign(card.style, { left: `${clampX(r.left - PAD)}px`, top: `${clampY(r.top - PAD - GAP - ch)}px` });
      }
    }

    place(true);
    nextRef.current?.focus();
    const onMove = () => place(false);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [step, selector, block, pathname]);

  const kind = state?.kind;
  function finish() {
    if (kind) setSeen((prev) => (prev.includes(kind) ? prev : [...prev, kind]));
    endTour();
  }

  useEffect(() => {
    if (!kind) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setSeen((prev) => (prev.includes(kind!) ? prev : [...prev, kind!]));
      endTour();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [kind, setSeen]);

  if (!state || !step) {
    // The offer: the main tour first, the fusion round once a fusion run is
    // open. Only with a run on screen - the tour walks through its tabs.
    if (!mounted || !activeRun || pathname === "/new") return null;
    // On the Rules tab its own tour comes first: that is where it helps.
    const offer: TourKind | null =
      pathname === "/rules" && !seen.includes("rules")
        ? "rules"
        : !seen.includes("main")
          ? "main"
          : fusionGameIds.includes(activeRun.gameId) && !seen.includes("fusion")
            ? "fusion"
            : null;
    if (!offer) return null;
    return (
      <Card role="region" aria-label={t.offer[offer].title} padding="none" className="fixed inset-x-2 bottom-2 z-40 flex items-center gap-2 border-line-strong p-2 pl-3 shadow-lg sm:inset-x-auto sm:bottom-4 sm:right-4 sm:block sm:w-80 sm:p-4">
        {/* On a phone: one flat bar, title only, so the fields under it stay
            in reach. From sm: the card with its sentence. */}
        <p className="min-w-0 flex-1 text-sm font-semibold text-ink">{t.offer[offer].title}</p>
        <p className="mt-1 hidden text-sm text-ink-muted sm:block">{t.offer[offer].text}</p>
        <div className="flex shrink-0 justify-end gap-2 sm:mt-3">
          <Button size="sm" variant="ghost" onClick={() => setSeen((prev) => [...prev, offer])}>
            {t.decline}
          </Button>
          <Button size="sm" variant="primary" onClick={() => startTour(offer)}>
            {t.start}
          </Button>
        </div>
      </Card>
    );
  }

  const texts = t[state.kind] as Record<string, string>;
  const tabKey = step.href ? (step.href.slice(1) as keyof typeof tNav) : null;
  // A step's own title wins; a tab step without one is named after its tab.
  const title = texts[`${step.id}Title`] ?? (tabKey ? tNav[tabKey] : t[state.kind].title);
  const last = state.step === steps.length - 1;

  return (
    <>
      {/* Keeps the page from being used mid-tour; the hole's shadow is what
          dims it. */}
      <div className="fixed inset-0 z-70" />
      <div
        ref={holeRef}
        aria-hidden
        className="tour-hole pointer-events-none fixed z-70 rounded-md transition-all duration-300 ease-out motion-reduce:transition-none"
      />
      <div
        ref={cardRef}
        role="dialog"
        aria-labelledby={titleId}
        className="fixed z-70 w-88 max-w-[calc(100vw-1.5rem)] rounded-lg border border-line-strong bg-panel p-4 shadow-2xl"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id={titleId} className="text-base font-bold tracking-tight text-ink">
            {title}
          </h2>
          <span className="font-mono text-xs text-ink-muted">
            {state.step + 1}/{steps.length}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-ink-muted">{texts[step.id]}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Button size="sm" variant="ghost" onClick={finish}>
            {t.skip}
          </Button>
          <span className="flex gap-2">
            {state.step > 0 && (
              <Button size="sm" onClick={() => moveTour(-1)}>
                {t.back}
              </Button>
            )}
            <Button ref={nextRef} size="sm" variant="primary" onClick={() => (last ? finish() : moveTour(1))}>
              {last ? t.done : t.next}
            </Button>
          </span>
        </div>
      </div>
    </>
  );
}
