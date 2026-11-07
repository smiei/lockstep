import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pokemonForGeneration, type PokemonHistoryEntry } from "@/lib/pokemonHistory";
import { historicalMoveType, type MoveTypeHistoryEntry } from "@/lib/learnset";
import type { Pokemon } from "@/lib/data";

// Values read from the original ROMs (branding-local/rom-audit) and cross-checked
// with PokeAPI's past_stats: these species were buffed after Gen 6.
const read = <T,>(f: string): T => JSON.parse(readFileSync(join(process.cwd(), "data", f), "utf8"));
const pokemon = read<Pokemon[]>("pokemon.json");
const history = read<PokemonHistoryEntry[]>("pokemon-history.json");
const at = (id: number, gen: number) =>
  pokemonForGeneration(history, pokemon.find((p) => p.id === id)!, gen);

describe("ROM-verified history entries", () => {
  it("Arbok had 85 Attack in Gen 3 and 4, today's 95 from Gen 7", () => {
    expect(at(24, 3).stats["Ang."]).toBe(85);
    expect(at(24, 4).stats["Ang."]).toBe(85);
    expect(at(24, 7).stats["Ang."]).toBe(95);
  });
  it("Corsola, Cresselia and Dodrio", () => {
    expect(at(222, 3).stats.KP).toBe(55);
    expect(at(488, 4).stats["Vert."]).toBe(120);
    expect(at(488, 9).stats["Vert."]).toBe(110);
    expect(at(85, 5).stats["Init."]).toBe(100);
  });
  it("Raticate catches at 90 through Gen 2, 127 after", () => {
    const h = read<{ id: number; catchRate: number; maxGeneration: number }[]>("catchrate-history.json");
    const e = h.find((x) => x.id === 20)!;
    expect(e.catchRate).toBe(90);
    expect(e.maxGeneration).toBe(2);
  });
  it("Bite, Gust, Karate Chop, Sand-Attack and Curse types", () => {
    const m = read<MoveTypeHistoryEntry[]>("move-type-history.json");
    expect(historicalMoveType(m, "bite", 1, "dark")).toBe("normal");
    expect(historicalMoveType(m, "bite", 2, "dark")).toBe("dark");
    expect(historicalMoveType(m, "sand-attack", 2, "ground")).toBe("ground");
    expect(historicalMoveType(m, "curse", 4, "ghost")).toBe("unknown");
    expect(historicalMoveType(m, "curse", 5, "ghost")).toBe("ghost");
  });
});
