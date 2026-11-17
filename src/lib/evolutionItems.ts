import type { EvolutionEntry, EvolutionMethod } from "@/lib/data";

// The items a Pokémon still needs for the rest of its evolution line - what
// the Overview's "evolution items" list shows per player. Client-safe and
// pure; the evolution table passed in already has the run's randomizer rules
// and the game pack's own evolutions applied (getEvolutions).

export type EvolutionItemKind =
  // Used on the Pokémon (a stone).
  | "use"
  // Held while levelling up.
  | "held"
  // Held while being traded.
  | "trade";

export type EvolutionItemStep = {
  item: string;
  kind: EvolutionItemKind;
  // The stage that evolves and what it becomes.
  fromId: number;
  toId: number;
  // The stage branches (Eevee, Gloom, Poliwhirl ...): this item is one of
  // several ways on, not something the line needs in any case.
  alternative: boolean;
};

function itemOf(method: EvolutionMethod | null | undefined): { item: string; kind: EvolutionItemKind } | null {
  if (!method) return null;
  switch (method.kind) {
    case "item":
      return { item: method.item, kind: "use" };
    case "levelHeld":
      return { item: method.item, kind: "held" };
    case "trade":
      return method.item ? { item: method.item, kind: "trade" } : null;
    default:
      return null;
  }
}

// Every item step from `startId` to the end of its line, in walking order.
// `inGame` keeps stages that do not exist in this game out (dexLimit, formes).
export function evolutionItemSteps(
  startId: number,
  evolutionById: ReadonlyMap<number, EvolutionEntry>,
  inGame: (id: number) => boolean,
): EvolutionItemStep[] {
  const steps: EvolutionItemStep[] = [];
  const seen = new Set<number>([startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const fromId = queue.shift() as number;
    const children = (evolutionById.get(fromId)?.evolvesTo ?? []).filter((id) => inGame(id) && !seen.has(id));
    for (const toId of children) {
      seen.add(toId);
      queue.push(toId);
      const need = itemOf(evolutionById.get(toId)?.method);
      if (need) steps.push({ ...need, fromId, toId, alternative: children.length > 1 });
    }
  }
  return steps;
}

// The Team tab's fragment for one Pokémon, so a list elsewhere (the
// Overview's evolution items) can link straight to it: /links?run=...#<id>.
export function encounterAnchorId(encounterId: number): string {
  return `pokemon-${encounterId}`;
}
