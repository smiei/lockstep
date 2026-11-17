// "Open only" on the Encounter tab hides every complete route - except the
// ones a player is in the middle of, so filling in a species does not make the
// row vanish before the nickname, shiny flag or status can be set. Client-safe
// and pure (TrackerView, src/lib/__tests__/openOnlyKeep.test.ts).
//
// Two routes stay, at most:
// - the one edited on this page in this visit, while it still has an entry
//   (an entry typed into the wrong route and cleared again leaves nothing to
//   keep - the route is open again and shows anyway);
// - the route of the newest catch on the list, by when the entry was CREATED.
//   Until 6.0 this was the entry changed last (`updatedAt`), and evolving,
//   changing a forme or fusing on the Team tab touches that too - which put
//   a long-finished early route back at the top of the list.

type KeepEncounter = { id: number; routeId: number; createdAt: Date | string };

export function keptRouteIds(
  encounters: KeepEncounter[],
  // The routes the Encounter tab lists: hidden free-team and fusion-body
  // routes, and statics while the rule is off, are not candidates.
  trackableIds: Set<number>,
  touchedRouteId: number | null,
): Set<number> {
  const kept = new Set<number>();
  if (touchedRouteId !== null && encounters.some((e) => e.routeId === touchedRouteId)) {
    kept.add(touchedRouteId);
  }
  let newest: KeepEncounter | null = null;
  let newestAt = -Infinity;
  for (const e of encounters) {
    if (!trackableIds.has(e.routeId)) continue;
    const at = new Date(e.createdAt).getTime();
    // Same millisecond (an import, two players at once): the later row wins.
    if (at > newestAt || (at === newestAt && newest !== null && e.id > newest.id)) {
      newest = e;
      newestAt = at;
    }
  }
  if (newest) kept.add(newest.routeId);
  return kept;
}
