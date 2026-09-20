// How fast a public instance lets new runs appear, client-safe and pure.
//
// Nobody has to log in to create a run, so nothing but this stands between one
// script and the free tier's row-write quota (which, once spent, takes the site
// down for every existing player until the month turns over). A per-visitor
// limit would need an address to key on, and this app stores none - so it is a
// limit for the whole site: at most NEW_RUN_LIMIT runs per NEW_RUN_WINDOW_MS.
// That caps the damage of an attack at a fixed rate instead of an open one,
// while an honest burst (a Reddit thread sending people over) stays well below
// it: 20 a minute is 1,200 an hour.
export const NEW_RUN_LIMIT = 20;
export const NEW_RUN_WINDOW_MS = 60_000;

// `newest` is the creation time of the most recently created runs, newest
// first - only the NEW_RUN_LIMIT-th one matters. If even the 20th-newest run
// is younger than the window, 20 runs appeared inside it.
export function newRunsExceedLimit(
  newest: readonly Date[],
  now: number,
  limit: number = NEW_RUN_LIMIT,
  windowMs: number = NEW_RUN_WINDOW_MS,
): boolean {
  return newest.length >= limit && now - newest[limit - 1].getTime() < windowMs;
}
