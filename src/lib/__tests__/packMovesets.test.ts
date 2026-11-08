import { describe, it, expect } from "vitest";
import { getGameOrDefault, getMoveset, getTmCompat, getLearnset } from "@/lib/data";
import { getLearnsetForGame, getMovesetForGame, getTmCompatForGame } from "@/lib/gameData";

// A ROM hack's own movesets/tm-compat (read from its ROM) replace the base
// game's version-group tables; every other pack keeps those tables.
describe("pack-own movesets and TM compatibility", () => {
  it("an official pack keeps its version group's tables", () => {
    const game = getGameOrDefault("platinum");
    expect(getMovesetForGame(game)).toEqual(getMoveset("platinum"));
    expect(getTmCompatForGame(game)).toEqual(getTmCompat("platinum"));
    expect(getLearnsetForGame(game)).toEqual(getLearnset("platinum"));
  });

  it("Renegade Platinum teaches its own moves (Clefairy's Moonblast, not Platinum's list)", () => {
    const game = getGameOrDefault("renegade-platinum");
    const clefairy = getMovesetForGame(game)["35"].map(([, slug]) => slug);
    expect(clefairy).toContain("moonblast");
    expect(getMoveset("platinum")["35"].map(([, slug]) => slug)).not.toContain("moonblast");
    // the coverage table is built from the pack's own list, Fairy included
    expect(getLearnsetForGame(game)["35"].fairy).toBe(9); // Disarming Voice
  });

  it("the coverage table only counts damaging moves at their lowest level", () => {
    const game = getGameOrDefault("renegade-platinum");
    const learnset = getLearnsetForGame(game);
    for (const [id, list] of Object.entries(getMovesetForGame(game))) {
      const levels = Object.values(learnset[id] ?? {});
      for (const level of levels) expect(list.some(([lv]) => lv === level), id).toBe(true);
    }
  });
});
