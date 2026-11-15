import { describe, it, expect } from "vitest";
import { getGameById } from "@/lib/data";
import { getPokemonListForGame, isInDex } from "@/lib/gameData";

// ROM hacks that keep only part of the dex list the species their own game
// data has (species.json); the pickers must not offer the rest.
describe("species allowlist of ROM hacks", () => {
  it("Blazing Emerald offers its own roster, not every id up to its dex limit", () => {
    const game = getGameById("blazing-emerald")!;
    const ids = new Set(getPokemonListForGame(game).map((p) => p.id));
    expect(ids.has(1)).toBe(true);
    expect(ids.has(16)).toBe(false); // no Pidgey in Blazing Emerald
    expect([...ids].some((id) => id > 20000)).toBe(true); // its own Pokemon stay
    expect(isInDex(game, 16)).toBe(false);
  });

  it("Blazed Glazed keeps Eevee, whose two slots the game names Def-/Off-Eevee", () => {
    const game = getGameById("blazed-glazed")!;
    expect(isInDex(game, 133)).toBe(true);
    expect(isInDex(game, 43)).toBe(false); // Oddish is not in the game
  });

  it("Run & Bun offers a regional forme whose base species the game lacks", () => {
    const game = getGameById("run-and-bun")!;
    const list = getPokemonListForGame(game);
    expect(isInDex(game, 10)).toBe(false); // no Caterpie
    expect(list.some((p) => p.id === 74)).toBe(false); // no Kantonian Geodude ...
    const alolan = list.filter((p) => p.baseId === 74);
    expect(alolan).toHaveLength(1); // ... but the Alolan one, listed once
    expect(new Set(list.map((p) => p.id)).size).toBe(list.length);
  });

  it("Sword/Shield and Scarlet/Violet offer only the species the games have", () => {
    const sword = getGameById("sword")!;
    expect(isInDex(sword, 25)).toBe(true);
    expect(isInDex(sword, 16)).toBe(false); // Pidgey is not in Sword/Shield
    expect(getPokemonListForGame(sword).some((p) => p.regional)).toBe(true);
    const sv = getGameById("scarlet-violet")!;
    expect(isInDex(sv, 906)).toBe(true);
    expect(isInDex(sv, 10)).toBe(false); // no Caterpie in Scarlet/Violet
  });

  it("Infinite Fusion keeps its formes rule", () => {
    const game = getGameById("infinite-fusion-classic")!;
    expect(getPokemonListForGame(game).length).toBeGreaterThan(500);
  });
});
