// The guided tour's state: which tour runs and at which step. A module-level
// store rather than React state, because the tour (mounted once in the root
// layout) is started from elsewhere - the offer card, the Settings page - and
// has to survive the navigation between tabs its steps make.

export type TourKind = "main" | "fusion" | "rules";

// One step: the tab it shows (the tour navigates there) and the element it
// points at - the first VISIBLE match, since the shell renders some controls
// twice, one per layout. Without a selector the card sits in the middle.
export type TourStep = {
  id: string;
  href?: string;
  selector?: string;
  // How the target is scrolled into view; the default keeps scrolling to a
  // minimum (right for the nav rail), a whole page section reads better
  // centred.
  block?: ScrollLogicalPosition;
};

const tab = (href: string): TourStep => ({ id: href.slice(1), href, selector: `nav a[href^="${href}"]` });

export const TOURS: Record<TourKind, TourStep[]> = {
  main: [
    { id: "welcome" },
    { id: "run", selector: '[data-tour="run"]' },
    tab("/overview"),
    tab("/tracker"),
    tab("/links"),
    tab("/typen"),
    tab("/levelcaps"),
    tab("/rules"),
    { id: "settings", selector: 'a[href^="/settings"]' },
  ],
  fusion: [{ id: "intro" }, tab("/tracker"), tab("/links"), tab("/rules")],
  // The Rules tab explained, group by group. Every step stays on /rules, so
  // the tour also works when started from the Settings page. A group the
  // run's game does not show (Randomizer) leaves its card in the middle.
  rules: [
    { id: "intro", href: "/rules" },
    { id: "summary", href: "/rules", selector: '[data-tour="rules-summary"]' },
    { id: "catching", href: "/rules", selector: 'section[aria-labelledby="rules-group-catching"]', block: "center" },
    { id: "caps", href: "/rules", selector: 'section[aria-labelledby="rules-group-caps"]', block: "center" },
    { id: "blindflug", href: "/rules", selector: 'section[aria-labelledby="rules-group-blindflug"]', block: "center" },
    { id: "randomizer", href: "/rules", selector: 'section[aria-labelledby="rules-group-randomizer"]', block: "center" },
    { id: "run", href: "/rules", selector: 'section[aria-labelledby="rules-group-run"]', block: "center" },
    { id: "presets", href: "/rules", selector: '[data-tour="rules-presets"]' },
    { id: "notes", href: "/rules", selector: '[data-tour="rules-notes"]', block: "start" },
  ],
};

// Which tours this device has seen or declined (localStorage, per device).
export const TOUR_SEEN_KEY = "nuzlocke:tourSeen";

export type TourState = { kind: TourKind; step: number } | null;

let state: TourState = null;
const listeners = new Set<() => void>();

function set(next: TourState) {
  state = next;
  for (const listener of listeners) listener();
}

export function subscribeTour(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTourState(): TourState {
  return state;
}

export function startTour(kind: TourKind) {
  set({ kind, step: 0 });
}

export function endTour() {
  set(null);
}

// Moves by one step; past the last one the tour is over. Returns whether it
// still runs, so the caller knows when to record it as seen.
export function moveTour(delta: 1 | -1): boolean {
  if (!state) return false;
  const step = state.step + delta;
  if (step < 0) return true;
  if (step >= TOURS[state.kind].length) {
    set(null);
    return false;
  }
  set({ kind: state.kind, step });
  return true;
}
