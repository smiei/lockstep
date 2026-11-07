import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  getEvolutionById,
  getEvolutionOverrideCategories,
  withGameEvolutions,
  type EvolutionEntry,
  type EvolutionOverride,
} from "@/lib/data";
import { formatEvolutionMethod } from "@/lib/evolutionMethods";

// A pack's "game" evolution entries: how that game itself evolves a Pokémon
// (a ROM hack's own changes, read from its ROM). They always apply, have no
// rule switch, and may add an edge the shared table lacks.
const root = path.join(__dirname, "..", "..", "..");
const allOff = { impossible: false, easier: false, timeBased: false };

describe("game evolutions", () => {
  it("apply in their pack whatever the randomizer switches say", () => {
    for (const options of [{}, allOff]) {
      expect(getEvolutionById(65, { gameId: "renegade-platinum", ...options })?.method).toEqual({ kind: "level", level: 36 });
    }
    // and only there: vanilla Platinum keeps Kadabra's trade
    expect(getEvolutionById(65, { gameId: "platinum", ...allOff })?.method).toEqual({ kind: "trade" });
  });

  it("never show up as a rule switch", () => {
    expect(getEvolutionOverrideCategories("renegade-platinum")).toEqual([]);
    expect(getEvolutionOverrideCategories("platinum")).not.toContain("game");
  });

  it("swap the method of an existing edge and add a missing one", () => {
    const table: EvolutionEntry[] = [
      { id: 1, evolvesFrom: null, evolvesTo: [2], method: null },
      { id: 2, evolvesFrom: 1, evolvesTo: [], method: { kind: "level", level: 16 } },
      { id: 3, evolvesFrom: 1, evolvesTo: [], method: { kind: "trade" } },
    ];
    table[0].evolvesTo.push(3);
    const changes: EvolutionOverride[] = [
      { from: 1, to: 2, method: { kind: "level", level: 12 }, category: "game" },
      // re-parented: 3 now comes from 2, no longer from 1
      { from: 2, to: 3, method: { kind: "item", item: "moon-stone" }, category: "game" },
      // a species the table has no entry for
      { from: 3, to: 4, method: { kind: "level", level: 40 }, category: "game" },
    ];
    const out = new Map(withGameEvolutions(table, changes).map((e) => [e.id, e]));
    expect(out.get(2)?.method).toEqual({ kind: "level", level: 12 });
    expect(out.get(1)?.evolvesTo).toEqual([2]);
    expect(out.get(2)?.evolvesTo).toEqual([3]);
    expect(out.get(3)).toMatchObject({ evolvesFrom: 2, evolvesTo: [4], method: { kind: "item", item: "moon-stone" } });
    expect(out.get(4)).toMatchObject({ evolvesFrom: 3, evolvesTo: [] });
    // the input is left alone
    expect(table[0].evolvesTo).toEqual([2, 3]);
  });

  it("name every item they use in every language", () => {
    const missing: string[] = [];
    for (const id of readdirSync(path.join(root, "data", "games"))) {
      const file = path.join(root, "data", "games", id, "evolution-overrides.json");
      if (!existsSync(file)) continue;
      for (const entry of JSON.parse(readFileSync(file, "utf-8")) as EvolutionOverride[]) {
        const item = "item" in entry.method ? entry.method.item : undefined;
        if (!item) continue;
        for (const lang of ["de", "en", "fr", "es", "it"] as const) {
          const label = formatEvolutionMethod(entry.method, lang) ?? "";
          if (label.includes(item)) missing.push(`${id}: ${item} (${lang})`);
        }
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });
});
