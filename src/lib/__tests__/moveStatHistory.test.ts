import { describe, it, expect } from "vitest";
import { getMoves } from "@/lib/data";
import { moveStatsForGeneration } from "@/lib/learnset";

// data/move-stat-history.json: where PokeAPI's past values are wrong or
// missing. Pins taken from the games' own data (Gen 1-4) and Pokemon Showdown's
// per-generation data (Gen 5-8).
const moves = getMoves();
const at = (slug: string, generation: number) => moveStatsForGeneration(moves[slug], generation);

describe("move stat history", () => {
  it("gives the healing moves their 10 PP until Gen 8 (Scarlet/Violet cut them to 5)", () => {
    for (const slug of ["rest", "soft-boiled", "milk-drink", "recover", "slack-off", "roost"]) {
      expect(at(slug, 8).pp, slug).toBe(10);
      expect(at(slug, 9).pp, slug).toBe(5);
    }
    expect(at("rest", 1).pp).toBe(10);
    expect(at("soft-boiled", 2).pp).toBe(10);
  });

  it("matches the games' own data where PokeAPI does not", () => {
    expect(at("mind-reader", 2).pp).toBe(5);
    expect(at("mind-reader", 4).pp).toBe(5);
    expect(at("swift", 1).accuracy).toBe(100);
    expect(at("hypnosis", 4).accuracy).toBe(60);
    expect(at("recover", 3).pp).toBe(20);
  });

  it("drops PokeAPI's wrong Gen 7 values", () => {
    expect(at("absorb", 7)).toMatchObject({ power: 20, pp: 25 });
    expect(at("absorb", 3).pp).toBe(20);
    expect(at("solar-beam", 7).power).toBe(120);
  });

  it("leaves untouched moves on their PokeAPI history", () => {
    expect(at("thunder", 3).power).toBe(120);
    expect(at("thunder", 6).power).toBe(110);
  });
});
