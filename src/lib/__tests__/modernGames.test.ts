import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { getGameOrDefault, getLevelCaps, getTmCompat } from "@/lib/data";
import {
  getCatchRatesForGame,
  getEffectivenessForGame,
  getPokemonByIdForGame,
  getPokemonListForGame,
  isInDex,
} from "@/lib/gameData";
import { getBallIdsForGeneration } from "@/lib/catchrate";
import { singleTypeMultiplier } from "@/lib/effectiveness";

// The Gen 6+ counterpart of gameDataRegression.test.ts: pins what the official
// X/Y-to-Scarlet/Violet packs show through the same calls every page makes
// (gameData.ts with the pack's game.json), so a change to the correction
// tables or the importer cannot quietly give them pre-Gen-6 data.

const root = process.cwd();
const games = readdirSync(path.join(root, "data", "games"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map(
    (entry) =>
      JSON.parse(readFileSync(path.join(root, "data", "games", entry.name, "game.json"), "utf-8")) as {
        id: string;
        generation: number;
        kind?: string;
      },
  )
  .filter((g) => (g.kind ?? "official") === "official" && g.generation >= 6)
  .map((g) => getGameOrDefault(g.id));

describe("official Gen 6+ packs", () => {
  it("covers exactly these games - another one changes this test's scope", () => {
    expect(games.map((g) => g.id).sort()).toEqual(
      [
        "x-y",
        "omega-ruby",
        "alpha-sapphire",
        "sun",
        "moon",
        "ultra-sun",
        "ultra-moon",
        "sword",
        "shield",
        "brilliant-diamond-shining-pearl",
        "scarlet-violet",
      ].sort(),
    );
  });

  it("use the Gen 6 type chart: Fairy exists, Steel no longer resists Ghost and Dark", () => {
    for (const game of games) {
      const table = getEffectivenessForGame(game);
      expect(singleTypeMultiplier(table, "dragon", "fairy"), game.id).toBe(0);
      expect(singleTypeMultiplier(table, "ghost", "steel"), game.id).toBe(1);
      expect(singleTypeMultiplier(table, "dark", "steel"), game.id).toBe(1);
    }
  });

  it("show the Fairy re-typings", () => {
    for (const game of games) {
      // Clefairy is in every one of these dexes (Galar's included).
      expect(getPokemonByIdForGame(game, 35)?.types, game.id).toEqual(["fairy"]);
    }
  });

  it("take the post-ORAS catch rates (Rayquaza 45)", () => {
    for (const game of games.filter((g) => g.dexLimit >= 384)) {
      const rate = getCatchRatesForGame(game).find((r) => r.id === 384)?.catch_rate;
      expect(rate, game.id).toBe(45);
    }
  });

  it("list their own dex and no further", () => {
    for (const game of games) {
      const list = getPokemonListForGame(game);
      const species = list.filter((p) => p.id < 10000);
      expect(Math.max(...species.map((p) => p.id)), game.id).toBe(game.dexLimit);
      expect(isInDex(game, game.dexLimit + 1), game.id).toBe(false);
    }
  });

  it("offer regional forms where the game has them", () => {
    const alolanVulpix = 10103;
    for (const game of games) {
      const offered = getPokemonListForGame(game).some((p) => p.id === alolanVulpix);
      expect(offered, game.id).toBe(game.generation >= 7 && game.id !== "brilliant-diamond-shining-pearl");
    }
  });

  it("hand out eight badges where the region has gyms (Alola has trials instead)", () => {
    for (const game of games) {
      const badges = getLevelCaps(game.id).filter((cap) => cap.badge !== null).length;
      expect(badges, game.id).toBe(game.generation === 7 ? 0 : 8);
    }
  });

  it("have a ball list for their generation and TM data except BDSP (PokeAPI has none)", () => {
    for (const game of games) {
      expect(getBallIdsForGeneration(game.generation, game.versionGroup).length, game.id).toBeGreaterThan(10);
      const tms = Object.keys(getTmCompat(game.versionGroup)).length;
      if (game.id === "brilliant-diamond-shining-pearl") expect(tms, game.id).toBe(0);
      else expect(tms, game.id).toBeGreaterThan(0);
    }
  });
});
