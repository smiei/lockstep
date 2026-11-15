import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// PokeAPI has no machine records for several version groups, which made
// their HMs come out as TMs (the TMs tab then labels Surf "TM"). The HM lists
// are the games' own; scripts/generate-learnsets.mjs carries the same table.
const G1 = ["cut", "flash", "fly", "strength", "surf"];
const G3 = ["cut", "dive", "flash", "fly", "rock-smash", "strength", "surf", "waterfall"];
const G4 = ["cut", "defog", "fly", "rock-climb", "rock-smash", "strength", "surf", "waterfall"];
const G5 = ["cut", "dive", "fly", "strength", "surf", "waterfall"];
const HMS: Record<string, string[]> = {
  "red-blue": G1,
  yellow: G1,
  crystal: ["cut", "flash", "fly", "strength", "surf", "waterfall", "whirlpool"],
  "ruby-sapphire": G3,
  emerald: G3,
  "firered-leafgreen": G3,
  "diamond-pearl": G4,
  platinum: G4,
  "heartgold-soulsilver": ["cut", "fly", "rock-climb", "rock-smash", "strength", "surf", "waterfall", "whirlpool"],
  "black-white": G5,
  "black-2-white-2": G5,
  "x-y": ["cut", "fly", "strength", "surf", "waterfall"],
  "omega-ruby-alpha-sapphire": ["cut", "dive", "fly", "rock-smash", "strength", "surf", "waterfall"],
  "sun-moon": [],
  "ultra-sun-ultra-moon": [],
};

type Table = Record<string, { machine?: { kind: "tm" | "hm" } }>;

describe("TM/HM kinds per version group", () => {
  for (const [vg, expected] of Object.entries(HMS)) {
    it(`${vg} has exactly its HMs marked as HM`, () => {
      const table = JSON.parse(
        readFileSync(path.join(process.cwd(), "data", "tm-compat", `${vg}.json`), "utf-8"),
      ) as Table;
      const hms = Object.entries(table)
        .filter(([, entry]) => entry.machine?.kind === "hm")
        .map(([slug]) => slug)
        .sort();
      expect(hms).toEqual(expected);
    });
  }
});
