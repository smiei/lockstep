// Where in the run a link died, as a Journey fight. Client-safe and pure.
//
// Since 7.0 the stored `SoulLink.deathLevelCapId` names the NEXT OPEN fight at
// the moment of death (the fight the team was heading for), not the last one
// already won. Deaths recorded before that have `deathCapIsNext = false` and
// still hold the last fight won; `effectiveDeathCapId` moves them one fight
// forward when they are read, so old and new deaths mean the same thing
// without rewriting rows (the fight order lives in the game pack's JSON, which
// a SQL migration cannot see).

// The first fight of the run not yet defeated, in Journey order. null = every
// fight is won.
export function nextOpenCapId(orderedCapIds: readonly number[], defeated: ReadonlySet<number>): number | null {
  return orderedCapIds.find((id) => !defeated.has(id)) ?? null;
}

export type StoredDeathPoint = {
  deathLevelCapId: number | null;
  deathCapIsNext: boolean;
};

// The fight a death belongs to under the "next open fight" meaning. Only
// meaningful for a recorded death (diedAt set); the caller handles the rest.
// An old-style null (died before the first win) becomes the first fight; an
// old-style id becomes the fight after it, or null when it was the last one
// (or is no longer part of the run, e.g. an excluded Kanto).
export function effectiveDeathCapId(point: StoredDeathPoint, orderedCapIds: readonly number[]): number | null {
  if (point.deathCapIsNext) return point.deathLevelCapId;
  if (point.deathLevelCapId === null) return orderedCapIds[0] ?? null;
  const index = orderedCapIds.indexOf(point.deathLevelCapId);
  return index === -1 ? null : (orderedCapIds[index + 1] ?? null);
}
