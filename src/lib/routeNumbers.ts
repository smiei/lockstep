// Catalogue numbers: every place a run can catch on gets the number of its
// position in the run's route list - the "Nr. 004" on a specimen label. The
// same number on the Encounter tab, the Team tab and the Memorial, so a pair
// can be found by it anywhere. Client-safe, no data imports.
//
// Numbered in display order, i.e. after the run's custom routes are spliced
// in (getRoutesForRun), so a custom route takes the number of the slot it was
// inserted at. Hidden routes - free-team slots and fusion bodies - are not
// places and get no number; they do not shift the others either.
export function routeNumbers(routes: readonly { id: number; hidden?: boolean }[]): Map<number, number> {
  const numbers = new Map<number, number>();
  let next = 1;
  for (const route of routes) {
    if (route.hidden) continue;
    numbers.set(route.id, next++);
  }
  return numbers;
}

// Three digits, the way a collection writes its numbers: "004". Runs with
// more than 999 places (none exist) simply print the longer number.
export function formatCatalogueNumber(n: number): string {
  return String(n).padStart(3, "0");
}
