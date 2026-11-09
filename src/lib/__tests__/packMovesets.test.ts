import { describe, it, expect } from "vitest";
import { getGameOrDefault, getMoveset, getTmCompat, getLearnset } from "@/lib/data";
import { getLearnsetForGame, getMovesForGame, getMovesetForGame, getTmCompatForGame } from "@/lib/gameData";

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

describe("a ROM hack's own moves", () => {
  it("Unbound's Leech Fang is in its move table and in its movesets", () => {
    const game = getGameOrDefault("unbound");
    const moves = getMovesForGame(game, "de");
    expect(moves["leech-fang"]).toMatchObject({ type: "bug", power: 80, damageClass: "physical" });
    // English name only: the German UI falls back to it
    expect(moves["leech-fang"].names.en).toBe("Leech Fang");
    expect(getTmCompatForGame(game)["leech-fang"]?.machine?.ids.length).toBeGreaterThan(0);
  });

  it("carry the ROM's English description as plain text", () => {
    const game = getGameOrDefault("radical-red");
    // a German page falls back to the English text, like moves.json's
    expect(getMovesForGame(game, "de")["dark-hole"].flavor).toBe(
      "The user sends the foe to the shadow realm. It may cause sleep.",
    );
  });

  it("other packs do not see them", () => {
    expect(getMovesForGame(getGameOrDefault("radical-red"), "de")["leech-fang"]).toBeUndefined();
  });
});

describe("formes with their own lists", () => {
  it("Renegade Platinum's Rotom formes learn their own signature move", () => {
    const game = getGameOrDefault("renegade-platinum");
    const movesets = getMovesetForGame(game);
    // Rotom formes are rows of their own (Wash Rotom = 10009)
    expect(movesets["10009"]).toBeDefined();
    expect(getTmCompatForGame(game)["thunderbolt"]?.machine?.ids).toContain(10009);
  });

  it("Radical Red's Alolan Vulpix has a list apart from Vulpix's", () => {
    const movesets = getMovesetForGame(getGameOrDefault("radical-red"));
    const alolan = movesets["10103"].map(([, slug]) => slug);
    expect(alolan).toContain("powder-snow");
    expect(movesets["37"].map(([, slug]) => slug)).not.toContain("powder-snow");
  });
});
