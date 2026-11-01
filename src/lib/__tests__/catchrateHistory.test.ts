import { describe, it, expect } from "vitest";
import { computeCatchChance } from "@/lib/catchrate";

// The seven species whose catch rate Omega Ruby/Alpha Sapphire changed. PokeAPI
// serves the post-ORAS numbers, so data/catchrate-history.json restores the
// values that applied through Gen 5 (the Gen 6+ packs take PokeAPI's). These
// assertions pin the resulting probabilities, which is what the Wild view shows.
const shared = {
  hpPercent: 100,
  level: 50,
  ball: "poke" as const,
  conditionMet: true,
  types: ["dragon"],
  turn: 1,
  status: "none" as const,
};

const pct = (rate: number, generation: number) =>
  Number((computeCatchChance(generation, { ...shared, baseRate: rate }).chance * 100).toFixed(2));

describe("catch chance for the ORAS-adjusted legendaries", () => {
  it("Rayquaza is brutal before ORAS (rate 3), not easy (rate 45)", () => {
    // The Cave of Dragonflies' Gen III/IV calculator agrees: ~0.4% at full HP
    // with a Poké Ball, and ~0.8% once asleep.
    expect(pct(3, 4)).toBe(0.39);
    expect(pct(45, 4)).toBe(5.88);
  });

  it("keeps the other pre-ORAS rates distinguishable", () => {
    // Kyogre/Groudon 5, Dialga/Palkia 30, Reshiram/Zekrom 45 - all were
    // flattened to 3 in ORAS.
    expect(pct(5, 4)).toBeGreaterThan(pct(3, 4));
    expect(pct(30, 4)).toBeGreaterThan(pct(5, 4));
    expect(pct(45, 4)).toBeGreaterThan(pct(30, 4));
  });

  it("still applies the Gen 5 formula for Black/White", () => {
    // Same rate, but from Gen 5 the chance is about (a/255)^0.75, not a/255:
    // markedly kinder (Bulbapedia: 11.94% for rate 45 at full HP).
    expect(pct(45, 5)).toBe(11.94);
    expect(pct(45, 5)).toBeGreaterThan(pct(45, 4));
  });
});
