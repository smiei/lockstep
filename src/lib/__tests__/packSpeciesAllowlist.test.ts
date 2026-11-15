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
    const game = getGameById("glazed")!;
    expect(isInDex(game, 133)).toBe(true);
    expect(isInDex(game, 43)).toBe(false); // Oddish is not in the game
  });

  it("Infinite Fusion keeps its formes rule", () => {
    const game = getGameById("infinite-fusion-classic")!;
    expect(getPokemonListForGame(game).length).toBeGreaterThan(500);
  });
});
