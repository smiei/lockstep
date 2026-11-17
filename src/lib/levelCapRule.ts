// Which boss fights set a level cap, and how far the rest of the team stays
// under it. Two run rules (src/lib/runSettings.ts): capsGymsOnly keeps the caps
// of gyms and the League only - rivals and villain bosses stay on the Journey
// as stations to tick off, without a level - and capTeamOffset is the house
// rule "one Pokemon at the cap, the others N levels below".
// Client-safe and pure, so pages, the side rail and the views share one rule.
import type { CapKind, LevelCap } from "@/lib/data";

export const CAP_TEAM_OFFSET_MAX = 10;
export const CAP_TEAM_OFFSET_DEFAULT = 2;

type KindSource = Pick<LevelCap, "badge" | "location" | "kind">;

// A pack may name the kind (a gym without a badge, kahunas and totems, a
// champion outside the Elite Four block); otherwise a badge means a gym and
// the Elite Four block the League.
export function capKind(cap: KindSource): CapKind {
  if (cap.kind) return cap.kind;
  if (cap.badge !== null && cap.badge !== undefined) return "gym";
  return cap.location.en === "Elite Four" ? "league" : "other";
}

// The run's caps: with capsGymsOnly every other fight loses its level and is
// then, like a fight the pack has no level for, a station without a cap.
// `skippedLevel` keeps the level it had, for display only (the Journey shows
// it small, in brackets, so the opponent's strength is still known); nothing
// may treat it as a cap.
export function applyCapRule<T extends KindSource & { max_level: number | null }>(
  caps: T[],
  rule: { capsGymsOnly: boolean },
): (T & { skippedLevel?: number })[] {
  if (!rule.capsGymsOnly) return caps;
  return caps.map((cap) =>
    cap.max_level !== null && capKind(cap) === "other"
      ? { ...cap, max_level: null, skippedLevel: cap.max_level }
      : cap,
  );
}

// The level the rest of the team may reach under a cap.
export function teamLevel(cap: number, offset: number): number {
  return Math.max(1, cap - offset);
}

export function parseCapTeamOffset(raw: unknown): number {
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw <= CAP_TEAM_OFFSET_MAX
    ? raw
    : CAP_TEAM_OFFSET_DEFAULT;
}
