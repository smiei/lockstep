import { describe, expect, it } from "vitest";
import type { EvolutionEntry } from "@/lib/data";
import { evolutionItemSteps } from "@/lib/evolutionItems";

const entries: EvolutionEntry[] = [
  // Oddish -> Gloom (level) -> Vileplume (Leaf Stone) | Bellossom (Sun Stone)
  { id: 43, evolvesFrom: null, evolvesTo: [44] },
  { id: 44, evolvesFrom: 43, evolvesTo: [45, 182], method: { kind: "level", level: 21 } },
  { id: 45, evolvesFrom: 44, evolvesTo: [], method: { kind: "item", item: "leaf-stone" } },
  { id: 182, evolvesFrom: 44, evolvesTo: [], method: { kind: "item", item: "sun-stone" } },
  // Onix -> Steelix (trade holding Metal Coat)
  { id: 95, evolvesFrom: null, evolvesTo: [208] },
  { id: 208, evolvesFrom: 95, evolvesTo: [], method: { kind: "trade", item: "metal-coat" } },
  // Machoke -> Machamp (plain trade: no item)
  { id: 67, evolvesFrom: 66, evolvesTo: [68], method: { kind: "level", level: 28 } },
  { id: 68, evolvesFrom: 67, evolvesTo: [], method: { kind: "trade" } },
  // Sneasel -> Weavile (held Razor Claw, randomizer's time-based rule)
  { id: 215, evolvesFrom: null, evolvesTo: [461] },
  { id: 461, evolvesFrom: 215, evolvesTo: [], method: { kind: "levelHeld", item: "razor-claw" } },
];
const byId = new Map(entries.map((e) => [e.id, e]));
const all = () => true;

describe("evolutionItemSteps", () => {
  it("walks the whole line and marks a branch's items as alternatives", () => {
    expect(evolutionItemSteps(43, byId, all)).toEqual([
      { item: "leaf-stone", kind: "use", fromId: 44, toId: 45, alternative: true },
      { item: "sun-stone", kind: "use", fromId: 44, toId: 182, alternative: true },
    ]);
  });

  it("starts at the current stage", () => {
    expect(evolutionItemSteps(45, byId, all)).toEqual([]);
  });

  it("knows trade and held items, and skips a trade without one", () => {
    expect(evolutionItemSteps(95, byId, all)).toEqual([
      { item: "metal-coat", kind: "trade", fromId: 95, toId: 208, alternative: false },
    ]);
    expect(evolutionItemSteps(67, byId, all)).toEqual([]);
    expect(evolutionItemSteps(215, byId, all)[0]).toMatchObject({ item: "razor-claw", kind: "held" });
  });

  it("leaves out stages the game does not have", () => {
    // A Gen 1 game: Bellossom (182) is not in the dex, so Gloom no longer branches.
    expect(evolutionItemSteps(44, byId, (id) => id <= 151)).toEqual([
      { item: "leaf-stone", kind: "use", fromId: 44, toId: 45, alternative: false },
    ]);
  });
});
