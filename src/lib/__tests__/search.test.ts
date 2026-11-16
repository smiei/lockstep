import { describe, expect, it } from "vitest";
import type { Pokemon } from "@/lib/data";
import { foldSearch, matchesPokemon } from "@/lib/search";

const mon = (id: number, de: string, en: string): Pokemon =>
  ({ id, names: { de, en }, types: [], family_id: id, stats: {}, legendary: false }) as unknown as Pokemon;

describe("foldSearch", () => {
  it("drops case, accents and outer blanks", () => {
    expect(foldSearch("  Flabébé ")).toBe("flabebe");
    expect(foldSearch("Käfer")).toBe("kafer");
  });
});

describe("matchesPokemon", () => {
  const pikachu = mon(25, "Pikachu", "Pikachu");
  const bisasam = mon(1, "Bisasam", "Bulbasaur");
  const flabebe = mon(669, "Flabébé", "Flabébé");

  it("finds a name without its accents", () => {
    expect(matchesPokemon(flabebe, "de", "flabebe")).toBe(true);
  });

  it("finds the English name on a page in another language", () => {
    expect(matchesPokemon(bisasam, "de", "bulba")).toBe(true);
    expect(matchesPokemon(bisasam, "de", "pika")).toBe(false);
  });

  it("reads digits as the start of the dex number", () => {
    expect(matchesPokemon(pikachu, "de", "25")).toBe(true);
    expect(matchesPokemon(pikachu, "de", "025")).toBe(true);
    expect(matchesPokemon(bisasam, "de", "25")).toBe(false);
  });

  it("matches everything for an empty query", () => {
    expect(matchesPokemon(pikachu, "de", "  ")).toBe(true);
  });
});
