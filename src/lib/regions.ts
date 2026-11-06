// HeartGold/SoulSilver's second region. Its routes and level caps carry
// `region: "kanto"`, and the run's includeKanto rule decides what that means:
// on, Kanto is part of the run (its own section on the Encounter tab, counted
// in both progress bars); off, it is post-game like the roaming legendaries.
// Client-safe and pure, so the pages and the Encounter tab share one rule.
import type { Region } from "@/lib/data";

type RegionRule = { includeKanto: boolean };

function excluded(region: Region | undefined, rule: RegionRule): boolean {
  return region === "kanto" && !rule.includeKanto;
}

// The run's routes with an excluded region turned into post-game, which is
// all the Encounter tab and computeRouteProgress need to know about it.
export function applyRegionRule<T extends { region?: Region; postgame?: boolean }>(
  routes: T[],
  rule: RegionRule,
): T[] {
  return routes.map((route) => (excluded(route.region, rule) ? { ...route, postgame: true } : route));
}

// The boss fights the Journey progress bar counts.
export function levelCapsInRun<T extends { region?: Region }>(caps: T[], rule: RegionRule): T[] {
  return caps.filter((cap) => !excluded(cap.region, rule));
}

// Whether a game has a second region at all - the rule only shows for those.
export function hasKanto(routes: { region?: Region }[]): boolean {
  return routes.some((route) => route.region === "kanto");
}
